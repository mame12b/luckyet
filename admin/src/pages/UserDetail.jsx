import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

export default function UserDetail() {
  const { userId } = useParams();
  const nav = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Reset password modal state
  // const [resetOpen, setResetOpen] = useState(false);
  // const [newPin, setNewPin] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(null);

  const load = () => {
    setLoading(true);
    api.get(`/admin/users/${userId}`)
      .then(({ data }) => setUser(data.user))
      .catch((err) => setError(err.response?.data?.message || "Failed to load user"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId]);

  const submitReset = async (e) => {
    e.preventDefault();
    setResetError("");
    if (!/^\d{6}$/.test(newPin)) {
      setResetError("Password must be exactly 6 digits");
      return;
    }
    setResetLoading(true);
    try {
      await api.post(`/admin/users/${userId}/reset-pin`, { newPin });
      setResetSuccess(newPin);   // show the new password to admin one time
      load();                     // refresh user data (clears lockout)
    } catch (err) {
      setResetError(err.response?.data?.message || "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  const closeReset = () => {
    // setResetOpen(false);
    // setNewPin("");
    // setResetError("");
    // setResetSuccess(null);
  };

  if (loading) {
    return <div className="p-6"><div className="h-64 bg-surface rounded-md animate-pulse"></div></div>;
  }
  if (error || !user) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="font-bold mb-2">{error || "User not found"}</div>
        <Link to="/users" className="text-brand-dark hover:underline text-sm">← Back to users</Link>
      </div>
    );
  }

  const locked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
  const isSelf = currentUser?._id === user._id;
  const isOtherSuperAdmin = user.role === "super_admin" && !isSelf;
  const canReset = currentUser?.role === "super_admin" && !isSelf && !isOtherSuperAdmin;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Link to="/users" className="text-sm text-text-muted hover:text-text mb-4 inline-block">← All users</Link>

      <header className="bg-white border border-border rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h1 className="text-xl font-bold mb-0.5">{user.fullName}</h1>
            <div className="text-xs text-text-muted uppercase tracking-wider font-semibold">{user.role.replace("_", " ")}</div>
          </div>
          {locked && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
              🔒 Locked until {new Date(user.lockedUntil).toLocaleString()}
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Field label="Email" value={user.email} />
          <Field label="Phone" value={user.phone} mono />
          <Field label="Country" value={user.country} />
          <Field label="Active" value={user.isActive ? "Yes" : "No"} />
          <Field label="Failed login attempts" value={user.loginAttempts || 0} />
          <Field label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
        </div>
      </header>

      {/* Actions */}
      <div className="bg-white border border-border rounded-xl p-5">
        <h2 className="font-bold mb-3 text-sm">Account actions</h2>

        {!canReset && (
          <p className="text-xs text-text-muted mb-3">
            {isSelf && "Use \"change password\" to update your own password."}
            {isOtherSuperAdmin && "You cannot reset another super admin's password."}
            {currentUser?.role !== "super_admin" && !isSelf && "Only super admins can reset passwords."}
          </p>
        )}

        {!canReset ? null : (
          <div>
            <Link to="/password-resets" className="bg-burgundy text-white font-semibold px-4 py-2 rounded-md hover:bg-burgundy-dark transition text-sm inline-block">
              🔑 View reset requests
            </Link>
            <p className="text-[11px] text-text-faint mt-2 leading-relaxed">
              Users initiate password resets themselves via "Forgot password" on the login page. Approve their request to generate a one-time code; the user then chooses their own password.
            </p>
          </div>
        )}

        <p className="text-[11px] text-text-faint mt-2 leading-relaxed">
          Resets the user's password to a value of your choosing and clears any account lockout.
          The user can log in immediately with the new password. They should change it on first login.
        </p>
      </div>

      {/* Reset modal */}
      {resetOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeReset}></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto">

              {!resetSuccess ? (
                <>
                  <h2 className="text-lg font-bold mb-1">Reset password</h2>
                  <p className="text-sm text-text-muted mb-4">
                    Set a new 6-digit password for <strong>{user.fullName}</strong>.
                    Share it securely (in person, WhatsApp, etc).
                  </p>

                  <form onSubmit={submitReset}>
                    <label className="block text-xs font-semibold mb-1">New password (6 digits)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength="6"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                      placeholder="e.g. 246810"
                      className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-3 text-2xl font-mono tracking-[0.3em] text-center"
                    />
                    {resetError && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-md mt-2">{resetError}</div>}

                    <div className="flex gap-2 mt-5">
                      <button type="button" onClick={closeReset} className="flex-1 bg-white border border-border font-semibold py-2.5 rounded-md hover:bg-surface text-sm">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={resetLoading || newPin.length !== 6}
                        className="flex-1 bg-burgundy text-white font-semibold py-2.5 rounded-md hover:bg-burgundy-dark transition disabled:opacity-50 text-sm"
                      >
                        {resetLoading ? "Resetting..." : "Reset password"}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">✓</div>
                    <h2 className="text-lg font-bold mb-1">Password reset</h2>
                    <p className="text-sm text-text-muted">Share this with {user.fullName.split(" ")[0]} securely:</p>
                  </div>

                  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-amber-800 text-center mb-1">New password</div>
                    <div className="font-mono font-extrabold text-3xl text-center tracking-[0.3em] text-burgundy">{resetSuccess}</div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-900 leading-relaxed">
                    💡 Tip: send this via WhatsApp, Telegram, or in person. They can log in immediately.
                  </div>

                  <button
                    onClick={closeReset}
                    className="w-full bg-burgundy text-white font-semibold py-2.5 rounded-md hover:bg-burgundy-dark text-sm"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide font-bold text-text-muted mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}

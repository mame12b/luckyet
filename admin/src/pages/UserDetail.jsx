import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

export default function UserDetail() {
  const { userId } = useParams();
  const currentUser = useAuthStore((s) => s.user);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get(`/admin/users/${userId}`)
      .then(({ data }) => setUser(data.user))
      .catch((err) => {
        console.error("UserDetail load error:", err);
        setError(err.response?.data?.message || "Failed to load user");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse mb-4"></div>
        <div className="h-64 bg-gray-100 rounded-md animate-pulse"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to="/users" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">← All users</Link>
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="font-bold mb-2">{error || "User not found"}</div>
          <Link to="/users" className="text-brand hover:underline text-sm">Back to users list</Link>
        </div>
      </div>
    );
  }

  const locked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
  const isSelf = currentUser?._id === user._id;
  const isOtherSuperAdmin = user.role === "super_admin" && !isSelf;
  const canShowResetLink = currentUser?.role === "super_admin" && !isSelf && !isOtherSuperAdmin;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <Link to="/users" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">← All users</Link>

      {/* Header card */}
      <header className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h1 className="text-xl font-bold mb-0.5">{user.fullName || "—"}</h1>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              {(user.role || "player").replace("_", " ")}
            </div>
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
          <Field label="Failed login attempts" value={user.loginAttempts ?? 0} />
          <Field label="Joined" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"} />
        </div>
      </header>

      {/* Actions card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-bold mb-3 text-sm">Account actions</h2>

        {isSelf ? (
          <p className="text-xs text-gray-500">This is your own account. Use the "change password" flow to update your password.</p>
        ) : isOtherSuperAdmin ? (
          <p className="text-xs text-gray-500">You cannot manage another super admin's account from here.</p>
        ) : currentUser?.role !== "super_admin" ? (
          <p className="text-xs text-gray-500">Only super admins can manage user passwords.</p>
        ) : (
          <div>
            <Link
              to="/password-resets"
              className="bg-brand text-white font-semibold px-4 py-2 rounded-md hover:bg-brand-dark transition text-sm inline-block"
            >
              🔑 View password reset requests
            </Link>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              Users initiate password resets themselves via "Forgot password" on the login page.
              You approve their request to generate a one-time code; the user then chooses their own password.
              You never see their password.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide font-bold text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}

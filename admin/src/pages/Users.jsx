import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

const ROLE_BADGES = {
  player: "bg-gray-100 text-gray-700",
  streamer: "bg-blue-100 text-blue-700",
  admin: "bg-amber-100 text-amber-800",
  super_admin: "bg-red-100 text-red-800",
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (roleFilter) params.set("role", roleFilter);
    api.get(`/admin/users?${params}`)
      .then(({ data }) => setUsers(data.users || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);  // debounce search
    return () => clearTimeout(t);
  }, [search, roleFilter]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-text-muted">Search, view, and manage user accounts.</p>
      </header>

      {/* Search + filter */}
      <div className="bg-white border border-border rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="flex-1 min-w-[200px] bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2 text-sm"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white border border-border outline-none rounded-md px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="player">Player</option>
          <option value="streamer">Streamer</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super admin</option>
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-surface rounded-md animate-pulse"></div>)}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-border rounded-lg p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <div className="font-semibold mb-1">No users found</div>
          <div className="text-sm text-text-muted">Try a different search or clear filters.</div>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border bg-surface text-[10px] uppercase tracking-wider font-bold text-text-muted">
            <div className="col-span-4">Name</div>
            <div className="col-span-3 hidden sm:block">Email</div>
            <div className="col-span-3">Phone</div>
            <div className="col-span-2 text-right">Role</div>
          </div>
          {users.map((u) => {
            const locked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
            return (
              <Link
                key={u._id}
                to={`/users/${u._id}`}
                className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface text-sm"
              >
                <div className="col-span-4 min-w-0">
                  <div className="font-semibold truncate">{u.fullName}</div>
                  <div className="text-xs text-text-muted sm:hidden truncate">{u.email}</div>
                  {locked && (
                    <span className="inline-block mt-0.5 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 rounded">🔒 Locked</span>
                  )}
                </div>
                <div className="col-span-3 truncate text-text-muted text-xs hidden sm:block">{u.email}</div>
                <div className="col-span-3 font-mono text-xs truncate">{u.phone}</div>
                <div className="col-span-2 text-right">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${ROLE_BADGES[u.role] || ROLE_BADGES.player}`}>
                    {u.role.replace("_", " ")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

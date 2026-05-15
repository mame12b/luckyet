import { Navigate } from "react-router-dom";
import { useAuthStore, isAdmin } from "../store/auth";

export default function ProtectedRoute({ children, requireSuperAdmin }) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/login" replace />;
  if (requireSuperAdmin && user.role !== "super_admin") {
    return (
      <div className="p-10 text-center">
        <h1 className="text-2xl font-bold mb-2">Access denied</h1>
        <p className="text-text-muted">Super admin access required for this page.</p>
      </div>
    );
  }

  return children;
}
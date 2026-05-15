import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PendingPayments from "./pages/PendingPayments";
import AllPayments from "./pages/AllPayments";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/payments/pending" element={<PendingPayments />} />
                <Route path="/payments" element={<AllPayments />} />
                <Route path="*" element={<div className="text-center py-12 text-text-muted">Page not found</div>} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import PendingPayments from "./pages/PendingPayments";
import AllPayments from "./pages/AllPayments";
import Draws from "./pages/Draws";
import DrawCreate from "./pages/DrawCreate";
import DrawEdit from "./pages/DrawEdit";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import UserDetail from "./pages/UserDetail";
import PasswordResets from "./pages/PasswordResets";
import Promoters from "./pages/Promoters";
import PromoterDetail from "./pages/PromoterDetail";
import Payouts from "./pages/Payouts";

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
                <Route path="/" element={<Overview />} />
                <Route path="/payments/pending" element={<PendingPayments />} />
                <Route path="/payments" element={<AllPayments />} />
                <Route path="/draws" element={<Draws />} />
                <Route path="/draws/new" element={<DrawCreate />} />
                <Route path="/draws/:id" element={<DrawEdit />} />
                <Route path="/users" element={<Users />} />
                <Route path="/users/:userId" element={<UserDetail />} />
                <Route path="/password-resets" element={<PasswordResets />} />
                <Route path="/promoters" element={<Promoters />} />
                <Route path="/promoters/:promoterId" element={<PromoterDetail />} />
                <Route path="/payouts" element={<Payouts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<div className="text-center py-12 text-text-muted">Page not found</div>} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}


import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Draws from "./pages/Draws";
import DrawDetail from "./pages/DrawDetail";
import BuyTicket from "./pages/BuyTicket";
import HowItWorks from "./pages/HowItWorks";
import MyTickets from "./pages/MyTickets";
import MyPayments from "./pages/MyPayments";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/draws" element={<Draws />} />
        <Route path="/draws/:slug" element={<DrawDetail />} />
        <Route path="/draws/:slug/buy" element={<BuyTicket />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/my-payments" element={<MyPayments />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={
          <div className="max-w-md mx-auto px-6 py-20 text-center">
            <h1 className="text-3xl font-bold mb-2">Page not found</h1>
            <p className="text-text-muted mb-6">The page you're looking for doesn't exist.</p>
            <a href="/" className="text-brand font-medium hover:underline">← Back home</a>
          </div>
        } />
      </Routes>
    </Layout>
  );
}

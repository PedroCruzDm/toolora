import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Categories from "@/pages/Categories";
import Submit from "@/pages/Submit";
import Cadastro from "@/pages/cadastro";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/ForgotPassword";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import DeleteAccount from "@/pages/DeleteAccount";
import AdminUsers from "@/pages/AdminUsers";
import AdminPendingPosts from "@/pages/AdminPendingPosts";
import AdminReviewedPosts from "@/pages/AdminReviewedPosts";
import AdminRequests from "@/pages/AdminRequests";
import OwnerInbox from "@/pages/OwnerInbox";
import { Toaster } from "sonner";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/categorias" element={<Categories />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ForgotPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/delete-account" element={<DeleteAccount />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/pending-posts" element={<AdminPendingPosts />} />
            <Route path="/admin/reviewed-posts" element={<AdminReviewedPosts />} />
            <Route path="/admin/requests" element={<AdminRequests />} />
            <Route path="/admin/inbox" element={<OwnerInbox />} />
          </Routes>
        </main>

        <Toaster
          richColors
          position="top-center"
          duration={4500}
          visibleToasts={1}
          gap={12}
          closeButton
          icons={{ success: null, info: null, warning: null, error: null, loading: null, close: null }}
        />
      </div>
    </Router>
  );
}

export default App;
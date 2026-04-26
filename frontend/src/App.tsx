import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Categories from "@/pages/Categories";
import Submit from "@/pages/Submit";
import Cadastro from "@/pages/cadastro";
import Login from "@/pages/login";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import DeleteAccount from "@/pages/DeleteAccount";
import AdminUsers from "@/pages/AdminUsers";
import AdminPendingPosts from "@/pages/AdminPendingPosts";
import AdminReviewedPosts from "@/pages/AdminReviewedPosts";
import AdminRequests from "@/pages/AdminRequests";
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
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/delete-account" element={<DeleteAccount />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/pending-posts" element={<AdminPendingPosts />} />
            <Route path="/admin/reviewed-posts" element={<AdminReviewedPosts />} />
            <Route path="/admin/requests" element={<AdminRequests />} />
          </Routes>
        </main>

        <Toaster richColors position="top-center" />
      </div>
    </Router>
  );
}

export default App;
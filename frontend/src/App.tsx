import { BrowserRouter as Router, Outlet, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "@/components/common/Navbar";
import SimpleHeader from "@/components/SimpleHeader";
import { HomeViewProvider, useHomeView } from "@/lib/homeView";
import Home from "@/pages/Home";
import RedirectToRootWithView from "@/pages/RedirectToRootWithView";
import ForgotPassword from "@/pages/ForgotPassword";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import DeleteAccount from "@/pages/DeleteAccount";
import { Toaster } from "sonner";

function RootLayout() {
  const location = useLocation();
  const { view } = useHomeView();
  const authPaths = new Set(["/login", "/cadastro", "/forgot-password", "/reset-password"]);
  const isAuthView = view === "login" || view === "cadastro" || authPaths.has(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {isAuthView ? <SimpleHeader /> : <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <HomeViewProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<Home />} />
            <Route path="categorias" element={<Home forcedView="categorias" />} />
            <Route path="submit" element={<Home forcedView="recomendar" />} />
            <Route path="cadastro" element={<RedirectToRootWithView view="cadastro" />} />
            <Route path="login" element={<RedirectToRootWithView view="login" />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ForgotPassword />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="delete-account" element={<DeleteAccount />} />
            <Route path="admin/users" element={<Home forcedView="admin-users" />} />
            <Route path="admin/pending-posts" element={<Home forcedView="admin-pending-posts" />} />
            <Route path="admin/reviewed-posts" element={<Home forcedView="admin-reviewed-posts" />} />
            <Route path="admin/requests" element={<Home forcedView="admin-requests" />} />
            <Route path="admin/inbox" element={<Home forcedView="admin-inbox" />} />
          </Route>
        </Routes>

        <Toaster
          richColors
          position="top-center"
          duration={4500}
          visibleToasts={1}
          gap={12}
          closeButton
          icons={{ success: null, info: null, warning: null, error: null, loading: null, close: null }}
        />
      </Router>
    </HomeViewProvider>
  );
}

export default App;
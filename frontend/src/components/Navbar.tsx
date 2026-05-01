// src/components/Navbar.tsx
import { Link, useNavigate } from "react-router-dom";
import { LogIn, PlusCircle, Moon, Sun, UserCircle2, ChevronDown, Settings, LogOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthSession, hasAdminAccess, hasModeratorAccess, readAuthSession } from "@/lib/auth";
import { useLocation } from "react-router-dom";
import api from "@/services/api";

const getInitials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authUser, setAuthUser] = useState<AuthSession | null>(() => readAuthSession());
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' ||
           (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = useMemo(() => Boolean(authUser), [authUser]);
  const isAdmin = useMemo(() => hasAdminAccess(authUser), [authUser]);
  const isModerator = useMemo(() => hasModeratorAccess(authUser), [authUser]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    const syncAuthState = async () => {
      const localSession = readAuthSession();
      setAuthUser(localSession);

      if (!localStorage.getItem("token")) {
        setAuthUser(null);
        return;
      }

      try {
        const response = await api.get<{ user: { name?: string; email: string; isOwner: boolean; isAdmin: boolean; isModerator: boolean; profileImage?: string | null } }>("/auth/me");
        const user = response.data.user;

        const session: AuthSession = {
          displayName: user.name ?? user.email,
          isOwner: Boolean(user.isOwner),
          isAdmin: Boolean(user.isAdmin),
          isModerator: Boolean(user.isModerator),
          profileImage: user.profileImage ?? null,
        };

        setAuthUser(session);
        localStorage.setItem("user", JSON.stringify(user));
      } catch {
        setAuthUser(localSession);
      }
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);

    return () => window.removeEventListener("storage", syncAuthState);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthUser(null);
    setIsMenuOpen(false);
    navigate("/login");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white dark:bg-gray-900 shadow-sm transition-colors">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Toolora" className="h-10" />
          <span className="font-extrabold text-3xl tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Toolora
          </span>
        </Link>

        <div className="flex items-center gap-8 text-base font-medium">
          <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Início</Link>
          <Link to="/categorias" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Categorias</Link>
          
          {isLoggedIn ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`hidden md:flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isAdmin
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/70"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
                }`}
              >
                {authUser?.profileImage ? (
                  <img
                    src={authUser.profileImage}
                    alt={authUser.displayName}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white ${isAdmin ? "bg-red-500" : "bg-emerald-500"}`}>
                    {getInitials(authUser?.displayName ?? "Usuário")}
                  </div>
                )}
                <span>{authUser?.displayName}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <UserCircle2 className="h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Editar perfil</span>
                  </Link>
                  {isAdmin && (
                    <>
                      <Link
                        to="/admin/users"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Usuario</span>
                      </Link>
                      <Link
                        to="/admin/pending-posts"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Pendentes (aplicar imagem)</span>
                      </Link>
                      <Link
                        to="/admin/requests"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Solicitações de ban</span>
                      </Link>
                      {authUser?.isOwner && (
                        <Link
                          to="/admin/inbox"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <span>Caixa de mensagens</span>
                        </Link>
                      )}
                      <Link
                        to="/admin/reviewed-posts"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Posts revisados</span>
                      </Link>                    </>
                  )}
                  {isModerator && !isAdmin && (
                    <>
                      <Link
                        to="/admin/pending-posts"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <span>Moderação de posts</span>
                      </Link>
                      <Link
                        to="/admin/requests"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <span>Solicitar ban</span>
                      </Link>
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          )}
          
          <Link 
            to="/submit" 
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.03] hover:shadow-lg transition-all duration-300"
          >
            <PlusCircle className="w-5 h-5" />
            Recomendar
          </Link>

          {isLoggedIn && (
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                  isAdmin
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/70"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
                }`}
              >
                {authUser?.profileImage ? (
                  <img
                    src={authUser.profileImage}
                    alt={authUser.displayName}
                    className="h-4 w-4 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle2 className="h-4 w-4" />
                )}
                <ChevronDown className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-6 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <UserCircle2 className="h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Editar perfil</span>
                  </Link>
                  {isAdmin && (
                    <>
                      <Link
                        to="/admin/users"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Usuario</span>
                      </Link>
                      <Link
                        to="/admin/pending-posts"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Pendentes (aplicar imagem)</span>
                      </Link>
                      <Link
                        to="/admin/requests"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Solicitações de ban</span>
                      </Link>
                      {authUser?.isOwner && (
                        <Link
                          to="/admin/inbox"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <span>Caixa de mensagens</span>
                        </Link>
                      )}
                    </>
                  )}
                  {isModerator && !isAdmin && (
                    <Link
                      to="/admin/requests"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      <span>Solicitar ban</span>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Toggle Dark Mode */}
         <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
          aria-label="Alternar modo escuro"
        >
        {darkMode ? (
          <Sun className="h-5 w-5 text-yellow-400" />
        ) : (
          <Moon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
        )}
          </button>
        </div>
      </div>
    </nav>
  );
}
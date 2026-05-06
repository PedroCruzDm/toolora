import { Link, useNavigate } from "react-router-dom";
import { Moon, Sun, UserCircle2, ChevronDown, Settings, LogOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthSession, clearAuthSession, getAuthToken, hasAdminAccess, hasModeratorAccess, readAuthSession, updateAuthUser } from "@/lib/auth";
import { useLocation } from "react-router-dom";
import api from "@/services/api";
import { HomeView, useHomeView } from "@/lib/homeView";

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
  const { setView } = useHomeView();
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

      if (!getAuthToken()) {
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
        updateAuthUser(user);
      } catch {
        setAuthUser(localSession);
      }
    };

    syncAuthState();
    window.addEventListener("toolora-auth-change", syncAuthState);

    return () => window.removeEventListener("toolora-auth-change", syncAuthState);
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
    clearAuthSession();
    setAuthUser(null);
    setIsMenuOpen(false);
    navigate("/login");
  };

  const handleMainViewChange = (next: HomeView) => {
    setView(next);
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white dark:bg-gray-900 shadow-sm transition-colors">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 py-3 sm:py-4 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3" onClick={() => setView("inicio")}>
          <img src="/logo.png" alt="Toolora" className="h-8 sm:h-10" />
          <span className="font-extrabold text-xl sm:text-3xl tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Toolora
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 lg:gap-6 text-sm sm:text-base font-medium">
          <button
            type="button"
            onClick={() => handleMainViewChange("inicio")}
            className="hidden lg:inline-flex hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Início
          </button>
          <button
            type="button"
            onClick={() => handleMainViewChange("categorias")}
            className="hidden lg:inline-flex hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Categorias
          </button>
          
          {isLoggedIn ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex items-center gap-2 rounded-full border px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                  isAdmin
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/70"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
                }`}
              >
                {authUser?.profileImage ? (
                  <img
                    src={authUser.profileImage}
                    alt={authUser.displayName}
                    className="h-4 sm:h-6 w-4 sm:w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className={`flex h-4 sm:h-6 w-4 sm:w-6 items-center justify-center rounded-full text-[8px] sm:text-[10px] font-black text-white ${isAdmin ? "bg-red-500" : "bg-emerald-500"}`}>
                    {getInitials(authUser?.displayName ?? "Usuário")}
                  </div>
                )}
                <span className="hidden sm:inline">{authUser?.displayName}</span>
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
                      <button
                        type="button"
                        onClick={() => {
                          handleMainViewChange("admin-users");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Usuario</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleMainViewChange("admin-pending-posts");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Pendentes (aplicar imagem)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleMainViewChange("admin-requests");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Solicitações de ban</span>
                      </button>
                      {authUser?.isOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            handleMainViewChange("admin-inbox");
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <span>Caixa de mensagens</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          handleMainViewChange("admin-reviewed-posts");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <span>Posts revisados</span>
                      </button>
                    </>
                  )}
                  {isModerator && !isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          handleMainViewChange("admin-pending-posts");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <span>Moderação de posts</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleMainViewChange("admin-requests");
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <span>Solicitar ban</span>
                      </button>
                      {authUser?.isOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            handleMainViewChange("admin-inbox");
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <span>Caixa de mensagens</span>
                        </button>
                      )}
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
              className="flex items-center gap-2 rounded-full border border-gray-200 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >
              <UserCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Entrar</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => handleMainViewChange("recomendar")}
            className="flex items-center gap-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm sm:text-base font-semibold rounded-xl sm:rounded-2xl hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.03] hover:shadow-lg transition-all duration-300"
          >
            <span className="hidden sm:inline">Recomendar</span>
            <span className="sm:hidden">+</span>
          </button>

          {/* Toggle Dark Mode */}
         <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 sm:p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
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
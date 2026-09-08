import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type HomeView =
  | "inicio"
  | "categorias"
  | "recomendar"
  | "login"
  | "cadastro"
  | "admin-users"
  | "admin-pending-posts"
  | "admin-reviewed-posts"
  | "admin-requests"
  | "admin-inbox";

type HomeViewContextValue = {
  view: HomeView;
  setView: (next: HomeView) => void;
};

const HOME_VIEW_KEY = "toolora-home-view";

const HomeViewContext = createContext<HomeViewContextValue | null>(null);

const getInitialView = (): HomeView => {
  if (typeof window === "undefined") return "inicio";

  const saved = window.sessionStorage.getItem(HOME_VIEW_KEY);
  const isPersistedView =
    saved === "categorias" ||
    saved === "recomendar" ||
    saved === "inicio" ||
    saved === "admin-users" ||
    saved === "admin-pending-posts" ||
    saved === "admin-reviewed-posts" ||
    saved === "admin-requests" ||
    saved === "admin-inbox";

  return isPersistedView ? (saved as HomeView) : "inicio";
};

export function HomeViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<HomeView>(() => getInitialView());

  const setView = (next: HomeView) => {
    setViewState(next);

    if (typeof window !== "undefined") {
      const shouldPersistView =
        next === "inicio" ||
        next === "categorias" ||
        next === "recomendar" ||
        next === "admin-users" ||
        next === "admin-pending-posts" ||
        next === "admin-reviewed-posts" ||
        next === "admin-requests" ||
        next === "admin-inbox";

      if (shouldPersistView) {
        window.sessionStorage.setItem(HOME_VIEW_KEY, next);
        return;
      }

      window.sessionStorage.removeItem(HOME_VIEW_KEY);
    }
  };

  const value = useMemo(() => ({ view, setView }), [view]);

  return <HomeViewContext.Provider value={value}>{children}</HomeViewContext.Provider>;
}

export function useHomeView() {
  const context = useContext(HomeViewContext);
  if (!context) {
    throw new Error("useHomeView must be used inside HomeViewProvider");
  }
  return context;
}

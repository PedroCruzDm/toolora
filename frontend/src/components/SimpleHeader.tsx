import { Link } from "react-router-dom";
import { useHomeView } from "@/lib/homeView";

export default function SimpleHeader() {
  const { setView } = useHomeView();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur dark:bg-gray-900/95 shadow-sm transition-colors">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-12 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Toolora" className="h-8 sm:h-10 w-auto" />
          <span className="font-extrabold text-lg sm:text-2xl lg:text-3xl tracking-tight text-blue-700 dark:text-blue-300">
            Toolora
          </span>
        </Link>

        <Link
          to="/"
          onClick={() => setView("inicio")}
          className="rounded-full border border-gray-200 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:border-indigo-200 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300 transition-colors"
        >
          Voltar
        </Link>
      </div>
    </header>
  );
}

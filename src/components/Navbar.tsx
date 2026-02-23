// src/components/Navbar.tsx
import { Link } from "react-router-dom";
import { PlusCircle, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' ||
           (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

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
          
          <Link 
            to="/submit" 
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.03] hover:shadow-lg transition-all duration-300"
          >
            <PlusCircle className="w-5 h-5" />
            Recomendar
          </Link>

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
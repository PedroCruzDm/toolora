import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";
import { Search, Users, Shield, Clock3 } from "lucide-react";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
};

const isCurrentUserAdmin = (): boolean => {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return false;
    const parsed = JSON.parse(stored) as { isAdmin?: boolean };
    return Boolean(parsed.isAdmin);
  } catch {
    return false;
  }
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isCurrentUserAdmin()) {
      toast.error("Acesso restrito a administradores.");
      navigate("/");
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await api.get<AdminUser[]>("/auth/users");
        setUsers(response.data);
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.error ?? "Não foi possível listar usuários."
          : "Não foi possível listar usuários.";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return users;

    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        (user.isAdmin ? "admin" : "usuario").includes(normalizedQuery)
      );
    });
  }, [query, users]);

  const totalAdmins = useMemo(() => users.filter((user) => user.isAdmin).length, [users]);
  const latestUser = useMemo(() => users[0] ?? null, [users]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-28 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-7xl">
      <div className="mb-10 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl dark:border-slate-700">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.5fr_1fr] lg:px-10 lg:py-10">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Painel admin
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Usuários registrados
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Visualize quem está cadastrado, identifique administradores e acompanhe os registros mais recentes em uma visão mais limpa e objetiva.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <Users className="h-4 w-4 text-sky-300" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Total</p>
                  <p className="text-lg font-semibold text-white">{users.length}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <Shield className="h-4 w-4 text-red-300" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Admins</p>
                  <p className="text-lg font-semibold text-white">{totalAdmins}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <Clock3 className="h-4 w-4 text-emerald-300" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Mais recente</p>
                  <p className="max-w-[220px] truncate text-lg font-semibold text-white">
                    {latestUser?.name ?? "Sem dados"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <label className="mb-2 block text-sm font-medium text-slate-200">Buscar usuário</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, email ou perfil"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              A busca filtra instantaneamente a lista abaixo.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          Carregando usuários...
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl transition-colors dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/70">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Nome</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Perfil</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Cadastro</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    className={`border-t border-slate-100 dark:border-slate-900 ${
                      index % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-50/60 dark:bg-slate-900/40"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black ${user.isAdmin ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{user.isAdmin ? "Administrador" : "Usuário comum"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.isAdmin
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {user.isAdmin ? "Admin" : "Usuario"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {new Date(user.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">#{user.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-slate-600 dark:text-slate-400">
              Nenhum usuário encontrado com esse filtro.
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

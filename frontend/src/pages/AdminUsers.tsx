import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";
import { Search, Users, Shield, Clock3, X } from "lucide-react";
import { hasModeratorAccess, readAuthSession } from "@/lib/auth";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isBanned: boolean;
  createdAt: string;
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => readAuthSession());
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<"warning" | "request-ban" | "ban" | "profile">("warning");
  const [banReason, setBanReason] = useState("");
  const [requestBanReason, setRequestBanReason] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get<AdminUser[]>('/admin/users');
      setUsers(response.data);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? 'Não foi possível listar usuários.'
        : 'Não foi possível listar usuários.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoaded) {
      return;
    }

    if (!hasModeratorAccess(session)) {
      toast.error("Acesso restrito à moderação.");
      navigate("/");
      return;
    }

    loadUsers();
  }, [navigate, session, sessionLoaded]);

  useEffect(() => {
    let active = true;

    const refreshSession = async () => {
      try {
        const response = await api.get<{ user: { name: string; email: string; isOwner: boolean; isAdmin: boolean; isModerator: boolean; profileImage?: string | null } }>("/auth/me");
        if (!active) return;

        setSession({
          displayName: response.data.user.name ?? response.data.user.email,
          isOwner: Boolean(response.data.user.isOwner),
          isAdmin: Boolean(response.data.user.isAdmin),
          isModerator: Boolean(response.data.user.isModerator),
          profileImage: response.data.user.profileImage ?? null,
        });
      } catch {
        if (!active) return;
      } finally {
        if (!active) return;
        setSessionLoaded(true);
      }
    };

    refreshSession();

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      if (statusFilter === "banned" && !user.isBanned) return false;
      if (statusFilter === "active" && user.isBanned) return false;

      const roleLabel = user.isOwner
        ? "owner"
        : user.isAdmin
          ? "admin"
          : user.isModerator
            ? "moderador"
            : user.isBanned
              ? "banido"
              : "usuario";

      if (!normalizedQuery) return true;

      return (
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        roleLabel.includes(normalizedQuery)
      );
    });
  }, [query, statusFilter, users]);

  const totalAdmins = useMemo(() => users.filter((user) => user.isAdmin).length, [users]);
  const totalBanned = useMemo(() => users.filter((user) => user.isBanned).length, [users]);
  const latestUser = useMemo(() => users[0] ?? null, [users]);
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const openUserModal = (userId: number) => {
    setSelectedUserId(userId);
    setModalTab('warning');
    setWarningMessage('');
    setRequestBanReason('');
    setBanReason('');
  };

  const closeUserModal = () => {
    setSelectedUserId(null);
    setActionLoading(false);
  };

  const handleBanUser = async () => {
    if (!selectedUser || !session?.isOwner) return;

    if (!banReason.trim()) {
      toast.error("Informe o motivo do banimento.");
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/admin/users/${selectedUser.id}/ban`, { reason: banReason });
      toast.success("Usuário banido.");
      await loadUsers();
      closeUserModal();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Nao foi possivel banir o usuario."
        : "Nao foi possivel banir o usuario.";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendWarning = async () => {
    if (!selectedUser || !(session?.isOwner || session?.isAdmin || session?.isModerator)) return;

    if (!warningMessage.trim()) {
      toast.error("Escreva a mensagem de aviso.");
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/admin/users/${selectedUser.id}/warning`, { message: warningMessage });
      toast.success("Aviso enviado.");
      setWarningMessage('');
      closeUserModal();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Nao foi possivel enviar o aviso."
        : "Nao foi possivel enviar o aviso.";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestBan = async () => {
    if (!selectedUser || !(session?.isOwner || session?.isAdmin || session?.isModerator)) return;

    if (!requestBanReason.trim()) {
      toast.error('Escreva o motivo da solicitação de banimento.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/admin/requests', {
        requestType: 'ban_user',
        targetUserId: selectedUser.id,
        reason: requestBanReason,
      });
      toast.success('Solicitação enviada para análise do owner.');
      setRequestBanReason('');
      closeUserModal();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? 'Nao foi possivel enviar a solicitacao.'
        : 'Nao foi possivel enviar a solicitacao.';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

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
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${statusFilter === "all" ? "bg-sky-500 text-white" : "bg-slate-900 text-slate-300"}`}
              >
                Todos ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${statusFilter === "active" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-300"}`}
              >
                Ativos ({users.length - totalBanned})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("banned")}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${statusFilter === "banned" ? "bg-rose-600 text-white" : "bg-slate-900 text-slate-300"}`}
              >
                Banidos ({totalBanned})
              </button>
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
                    onClick={() => openUserModal(user.id)}
                    className={`cursor-pointer border-t border-slate-100 transition hover:bg-slate-100/80 dark:border-slate-900 dark:hover:bg-slate-900/70 ${
                      selectedUserId === user.id
                        ? "bg-sky-50 dark:bg-sky-950/40"
                        : index % 2 === 0
                          ? "bg-white dark:bg-slate-950"
                          : "bg-slate-50/60 dark:bg-slate-900/40"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black ${user.isOwner || user.isAdmin ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : user.isModerator ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : user.isBanned ? "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {user.isOwner ? "Owner" : user.isAdmin ? "Administrador" : user.isModerator ? "Moderador" : user.isBanned ? "Banido" : "Usuário comum"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.isOwner || user.isAdmin
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : user.isModerator
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : user.isBanned
                                ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {user.isOwner ? "Owner" : user.isAdmin ? "Admin" : user.isModerator ? "Moderador" : user.isBanned ? "Banido" : "Usuario"}
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

        {selectedUser && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Ações para {selectedUser.name}</h2>
                  <p className="text-sm text-slate-400">{selectedUser.email}</p>
                </div>
                <button
                  onClick={closeUserModal}
                  className="rounded-full border border-slate-700 p-2 text-slate-300 hover:bg-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button onClick={() => setModalTab('warning')} className={`rounded-xl px-3 py-2 text-xs font-semibold ${modalTab === 'warning' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-300'}`}>Enviar aviso</button>
                <button onClick={() => setModalTab('request-ban')} className={`rounded-xl px-3 py-2 text-xs font-semibold ${modalTab === 'request-ban' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'}`}>Solicitar ban</button>
                <button onClick={() => setModalTab('ban')} className={`rounded-xl px-3 py-2 text-xs font-semibold ${modalTab === 'ban' ? 'bg-red-600 text-white' : 'bg-slate-900 text-slate-300'}`}>Banir</button>
                <button onClick={() => setModalTab('profile')} className={`rounded-xl px-3 py-2 text-xs font-semibold ${modalTab === 'profile' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300'}`}>Visualizar perfil</button>
              </div>

              {modalTab === 'warning' && (
                <div className="space-y-3">
                  <textarea
                    value={warningMessage}
                    onChange={(event) => setWarningMessage(event.target.value)}
                    rows={5}
                    placeholder="Mensagem de aviso"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none"
                  />
                  <button onClick={handleSendWarning} disabled={actionLoading} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {actionLoading ? 'Enviando...' : 'Enviar aviso'}
                  </button>
                </div>
              )}

              {modalTab === 'request-ban' && (
                <div className="space-y-3">
                  <textarea
                    value={requestBanReason}
                    onChange={(event) => setRequestBanReason(event.target.value)}
                    rows={5}
                    placeholder="Motivo da solicitação de banimento"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none"
                  />
                  <button onClick={handleRequestBan} disabled={actionLoading} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {actionLoading ? 'Enviando...' : 'Solicitar ban'}
                  </button>
                </div>
              )}

              {modalTab === 'ban' && (
                <div className="space-y-3">
                  {session?.isOwner ? (
                    <>
                      <textarea
                        value={banReason}
                        onChange={(event) => setBanReason(event.target.value)}
                        rows={5}
                        placeholder="Motivo do banimento"
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none"
                      />
                      <button onClick={handleBanUser} disabled={actionLoading} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {actionLoading ? 'Banindo...' : 'Banir usuário'}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Somente o owner pode banir diretamente. Use "Solicitar ban".</p>
                  )}
                </div>
              )}

              {modalTab === 'profile' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm">
                  <p><span className="text-slate-400">Nome:</span> {selectedUser.name}</p>
                  <p className="mt-1"><span className="text-slate-400">Email:</span> {selectedUser.email}</p>
                  <p className="mt-1"><span className="text-slate-400">Perfil:</span> {selectedUser.isOwner ? 'Owner' : selectedUser.isAdmin ? 'Admin' : selectedUser.isModerator ? 'Moderador' : 'Usuário'}</p>
                  <p className="mt-1"><span className="text-slate-400">Status:</span> {selectedUser.isBanned ? 'Banido' : 'Ativo'}</p>
                  <p className="mt-1"><span className="text-slate-400">Cadastro:</span> {new Date(selectedUser.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

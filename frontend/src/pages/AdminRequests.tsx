import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";
import { hasModeratorAccess, readAuthSession } from "@/lib/auth";

type ModerationRequest = {
  id: number;
  requesterName?: string | null;
  requestType: "ban_user" | "ban_post";
  targetUserId?: number | null;
  targetUserName?: string | null;
  targetToolId?: number | null;
  targetToolName?: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type UserOption = {
  id: number;
  name: string;
  email: string;
};

type ToolOption = {
  id: number;
  name: string;
};

export default function AdminRequests() {
  const navigate = useNavigate();
  const session = useMemo(() => readAuthSession(), []);
  const [requests, setRequests] = useState<ModerationRequest[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestType, setRequestType] = useState<"ban_user" | "ban_post">("ban_user");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetToolId, setTargetToolId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hasModeratorAccess(session)) {
      toast.error("Acesso restrito à moderação.");
      navigate("/");
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [requestsResponse, usersResponse, toolsResponse] = await Promise.all([
          api.get<ModerationRequest[]>("/management/requests"),
          api.get<UserOption[]>("/management/users"),
          api.get<ToolOption[]>("/tools/reviewed?status=approved"),
        ]);

        setRequests(requestsResponse.data);
        setUsers(usersResponse.data);
        setTools(toolsResponse.data.map((tool) => ({ id: tool.id, name: tool.name })));
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.error ?? "Nao foi possivel carregar as solicitacoes."
          : "Nao foi possivel carregar as solicitacoes.";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate, session]);

  const reload = async () => {
    const response = await api.get<ModerationRequest[]>('/management/requests');
    setRequests(response.data);
  };

  const handleSubmitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reason.trim()) {
      toast.error("Informe o motivo.");
      return;
    }

    if (requestType === 'ban_user' && !targetUserId) {
      toast.error("Escolha um usuário.");
      return;
    }

    if (requestType === 'ban_post' && !targetToolId) {
      toast.error("Escolha um post.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/management/requests', {
        requestType,
        targetUserId: requestType === 'ban_user' ? Number(targetUserId) : undefined,
        targetToolId: requestType === 'ban_post' ? Number(targetToolId) : undefined,
        reason,
      });

      setReason('');
      setTargetUserId('');
      setTargetToolId('');
      toast.success('Solicitação enviada.');
      await reload();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? 'Nao foi possivel enviar a solicitacao.'
        : 'Nao foi possivel enviar a solicitacao.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      await api.patch(`/management/requests/${requestId}/${action}`);
      toast.success(action === 'approve' ? 'Solicitação aprovada.' : 'Solicitação rejeitada.');
      await reload();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? 'Nao foi possivel revisar a solicitacao.'
        : 'Nao foi possivel revisar a solicitacao.';
      toast.error(message);
    }
  };

  const pendingRequests = requests.filter((request) => request.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-28 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h1 className="text-3xl font-black tracking-tight">Solicitações de banimento</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Moderadores podem solicitar banimentos. O dono do sistema aprova ou rejeita.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmitRequest} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
            <h2 className="text-xl font-bold">Nova solicitação</h2>
            <div className="flex gap-3">
              <button type="button" onClick={() => setRequestType('ban_user')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${requestType === 'ban_user' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>Banir usuário</button>
              <button type="button" onClick={() => setRequestType('ban_post')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${requestType === 'ban_post' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>Bloquear post</button>
            </div>

            {requestType === 'ban_user' ? (
              <select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="">Selecione um usuário</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                ))}
              </select>
            ) : (
              <select value={targetToolId} onChange={(event) => setTargetToolId(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="">Selecione um post aprovado</option>
                {tools.map((tool) => (
                  <option key={tool.id} value={tool.id}>{tool.name}</option>
                ))}
              </select>
            )}

            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={5} placeholder="Motivo da solicitação" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900" />

            <button disabled={submitting} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? 'Enviando...' : 'Enviar solicitação'}
            </button>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
            <h2 className="text-xl font-bold">Solicitações pendentes</h2>
            {loading ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Carregando...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Nenhuma solicitação pendente.</div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm font-semibold">{request.requestType === 'ban_user' ? 'Banir usuário' : 'Bloquear post'}</p>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Solicitado por:</span>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{request.requesterName ?? 'Desconhecido'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">{request.requestType === 'ban_user' ? 'Usuário a banir:' : 'Post a bloquear:'}</span>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{request.requestType === 'ban_user' ? (request.targetUserName ?? 'Desconhecido') : (request.targetToolName ?? 'Desconhecido')}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-300"><span className="text-slate-500 dark:text-slate-400">Motivo:</span> {request.reason}</p>
                    {session?.isOwner && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleReview(request.id, 'approve')} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">Aprovar</button>
                        <button onClick={() => handleReview(request.id, 'reject')} className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Rejeitar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
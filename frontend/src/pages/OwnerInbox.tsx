import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";

type InboxMessage = {
  id: number;
  senderUserId: number | null;
  senderRole: "owner" | "admin" | "moderator" | "system";
  recipientUserId: number;
  message: string;
  messageType: "warning" | "info";
  createdAt: string;
  readAt: string | null;
};

const roleLabel: Record<InboxMessage["senderRole"], string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderador",
  system: "Sistema",
};

export default function OwnerInbox() {
  const navigate = useNavigate();
  const { user: session, ready } = useAuthBootstrap();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [readLoadingId, setReadLoadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!session?.isOwner) {
      toast.error("Acesso restrito ao owner.");
      navigate("/");
      return;
    }

    const loadInbox = async () => {
      setLoading(true);
      try {
        const response = await api.get<InboxMessage[]>("/messages/me");
        setMessages(response.data);
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? error.response?.data?.error ?? "Nao foi possivel carregar a caixa de mensagens."
          : "Nao foi possivel carregar a caixa de mensagens.";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadInbox();
  }, [navigate, session, ready]);

  const markAsRead = async (messageId: number) => {
    setReadLoadingId(messageId);
    try {
      await api.patch(`/messages/${messageId}/read`);
      setMessages((previous) =>
        previous.map((message) =>
          message.id === messageId
            ? { ...message, readAt: new Date().toISOString() }
            : message
        )
      );
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Nao foi possivel marcar a mensagem como lida."
        : "Nao foi possivel marcar a mensagem como lida.";
      toast.error(message);
    } finally {
      setReadLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-28 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h1 className="text-3xl font-black tracking-tight">Caixa de mensagens do owner</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Aqui chegam as solicitações de banimento enviadas por moderadores e admins.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Carregando mensagens...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma mensagem no momento.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-2xl border p-4 ${
                    message.readAt
                      ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                      : "border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/20"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      {roleLabel[message.senderRole]} • {message.messageType === "info" ? "Solicitação" : "Mensagem"}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(message.createdAt).toLocaleString("pt-BR")}
                      </p>
                      {!message.readAt && (
                        <button
                          type="button"
                          onClick={() => markAsRead(message.id)}
                          disabled={readLoadingId === message.id}
                          className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
                        >
                          {readLoadingId === message.id ? "Salvando..." : "Marcar lida"}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{message.message}</p>
                  {message.readAt && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Lida em {new Date(message.readAt).toLocaleString("pt-BR")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";
import { CheckCircle2, Clock3, ExternalLink, RefreshCcw, ShieldX, Sparkles } from "lucide-react";

type PendingPost = {
  id: number;
  name: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
  username: string;
  created_at: string;
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

export default function AdminPendingPosts() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchPendingPosts = async () => {
    setLoading(true);
    try {
      const response = await api.get<PendingPost[]>("/tools/pending");
      setPosts(response.data);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível listar posts pendentes."
        : "Não foi possível listar posts pendentes.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isCurrentUserAdmin()) {
      toast.error("Acesso restrito a administradores.");
      navigate("/");
      return;
    }

    fetchPendingPosts();
  }, [navigate]);

  const handleDecision = async (postId: number, action: "approve" | "reject") => {
    setProcessingId(postId);
    try {
      await api.patch(`/tools/${postId}/${action}`);
      await fetchPendingPosts();
      toast.success(action === "approve" ? "Post aprovado." : "Post reprovado.");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? "Não foi possível concluir a ação."
        : "Não foi possível concluir a ação.";
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-28 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-10 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl dark:border-slate-700">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.5fr_1fr] lg:px-10 lg:py-10">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                Moderação de conteúdo
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Posts pendentes
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Aqui o admin aprova ou reprova as postagens enviadas pelos usuários antes de entrarem na lista pública.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <Clock3 className="h-4 w-4 text-amber-300" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Pendentes</p>
                    <p className="text-lg font-semibold text-white">{posts.length}</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <Sparkles className="h-4 w-4 text-sky-300" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ação</p>
                    <p className="text-lg font-semibold text-white">Revisão do admin</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-200">Fluxo de moderação</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>Aprovar e publicar a postagem.</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <ShieldX className="h-4 w-4 text-red-300" />
                  <span>Reprovar e manter fora da vitrine pública.</span>
                </div>
              </div>

              <button
                onClick={fetchPendingPosts}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar fila
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-700 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            Carregando posts pendentes...
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-700 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            Não existem posts pendentes no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {posts.map((post) => {
              const isProcessing = processingId === post.id;
              return (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl transition-colors dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="border-b border-slate-100 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          Pendente
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{post.name}</h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Enviado por <span className="font-semibold text-slate-800 dark:text-slate-200">{post.username}</span> em {new Date(post.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>

                      <a
                        href={post.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir ferramenta
                      </a>
                    </div>
                  </div>

                  <div className="px-6 py-6">
                    <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{post.description}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {post.tags?.map((tag) => (
                        <span
                          key={`${post.id}-${tag}`}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Categoria</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{post.category}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Autor</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{post.username}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleDecision(post.id, "approve")}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {isProcessing ? "Aprovando..." : "Aprovar postagem"}
                      </button>
                      <button
                        onClick={() => handleDecision(post.id, "reject")}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ShieldX className="h-4 w-4" />
                        {isProcessing ? "Reprovando..." : "Reprovar postagem"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

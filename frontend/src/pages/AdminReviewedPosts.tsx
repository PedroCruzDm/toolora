import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";
import { CheckCircle2, ExternalLink, RefreshCcw, ShieldX, Sparkles } from "lucide-react";
import { hasModeratorAccess } from "@/lib/auth";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";

type ReviewedPost = {
  id: number;
  name: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
  username: string;
  created_at: string;
  status: "approved" | "rejected";
  approved_at?: string;
  blocked_by_owner?: boolean;
  blocked_reason?: string | null;
  blocked_at?: string | null;
};

type TabType = "approved" | "rejected";

export default function AdminReviewedPosts() {
  const navigate = useNavigate();
  const { user: session, ready } = useAuthBootstrap();
  const [activeTab, setActiveTab] = useState<TabType>("approved");
  const [posts, setPosts] = useState<ReviewedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockingPostId, setBlockingPostId] = useState<number | null>(null);

  const fetchReviewedPosts = async () => {
    setLoading(true);
    try {
      const response = await api.get<ReviewedPost[]>(`/tools/reviewed?status=${activeTab}`);
      setPosts(response.data);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível listar posts revisados."
        : "Não foi possível listar posts revisados.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!hasModeratorAccess(session)) {
      toast.error("Acesso restrito a administradores.");
      navigate("/");
      return;
    }

    fetchReviewedPosts();
  }, [navigate, activeTab, session, ready]);

  const getStatusBadgeColor = (status: string) => {
    return status === "approved"
      ? "bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : "bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-red-700 dark:bg-red-900/30 dark:text-red-300";
  };

  const getStatusLabel = (status: string) => {
    return status === "approved" ? "Aprovado" : "Recusado";
  };

  const handleToggleBlock = async (post: ReviewedPost) => {
    if (!session?.isOwner) {
      toast.error("Apenas o owner pode bloquear ou desbloquear posts aprovados.");
      return;
    }

    setBlockingPostId(post.id);
    try {
      if (post.blocked_by_owner) {
        await api.post(`/management/posts/${post.id}/unblock`);
        toast.success("Post desbloqueado.");
      } else {
        const reason = window.prompt("Motivo do bloqueio:", post.blocked_reason ?? "") ?? "";
        await api.post(`/management/posts/${post.id}/block`, { reason: reason.trim() || undefined });
        toast.success("Post bloqueado.");
      }

      await fetchReviewedPosts();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível atualizar o bloqueio do post."
        : "Não foi possível atualizar o bloqueio do post.";
      toast.error(message);
    } finally {
      setBlockingPostId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-28 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-10 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl dark:border-slate-700">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.5fr_1fr] lg:px-10 lg:py-10">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                Histórico de moderação
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Posts revisados
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Veja todo o histórico de postagens que foram aprovadas ou recusadas pela moderação.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <Sparkles className="h-4 w-4 text-sky-300" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Total</p>
                    <p className="text-lg font-semibold text-white">{posts.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-200">Status de revisão</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>Posts aprovados e publicados na vitrine.</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <ShieldX className="h-4 w-4 text-red-300" />
                  <span>Posts recusados e mantidos fora do catálogo.</span>
                </div>
              </div>

              <button
                onClick={fetchReviewedPosts}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <RefreshCcw className="h-4 w-4" />
                Atualizar lista
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-4 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("approved")}
            className={`px-6 py-3 font-semibold text-base transition-colors ${
              activeTab === "approved"
                ? "border-b-2 border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Aprovados
            </div>
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`px-6 py-3 font-semibold text-base transition-colors ${
              activeTab === "rejected"
                ? "border-b-2 border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldX className="h-5 w-5" />
              Recusados
            </div>
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-700 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            Carregando posts {activeTab === "approved" ? "aprovados" : "recusados"}...
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-700 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            Não existem posts {activeTab === "approved" ? "aprovados" : "recusados"} no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl transition-colors dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className={`mb-2 inline-flex items-center gap-2 rounded-full ${getStatusBadgeColor(post.status)}`}>
                        {post.status === "approved" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <ShieldX className="h-3 w-3" />
                        )}
                        {getStatusLabel(post.status)}
                      </div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{post.name}</h2>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Enviado por <span className="font-semibold text-slate-800 dark:text-slate-200">{post.username}</span> em{" "}
                        {new Date(post.created_at).toLocaleString("pt-BR")}
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
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Revisor</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Admin</p>
                    </div>
                  </div>

                  {post.status === "approved" && (
                    <div className="mt-5 space-y-2">
                      {post.blocked_by_owner && (
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                          Bloqueado pelo owner{post.blocked_reason ? `: ${post.blocked_reason}` : "."}
                        </p>
                      )}

                      {session?.isOwner && (
                        <button
                          onClick={() => handleToggleBlock(post)}
                          disabled={blockingPostId === post.id}
                          className={`rounded-xl px-4 py-2 text-xs font-semibold text-white ${post.blocked_by_owner ? "bg-emerald-600" : "bg-red-600"} disabled:opacity-60`}
                        >
                          {blockingPostId === post.id
                            ? "Salvando..."
                            : post.blocked_by_owner
                              ? "Desbloquear post"
                              : "Bloquear post"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

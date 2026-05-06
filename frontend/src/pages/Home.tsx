import { ToolCard } from "@/components/ui/card";
import AdSidebar from "@/components/AdSidebar";
import { Tool } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Sparkles, Layers3, ShieldCheck } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/auth";
import api from "@/services/api";
import Categories from "@/pages/Categories";
import Submit from "@/pages/Submit";
import { HomeView, useHomeView } from "@/lib/homeView";
import AdminUsers from "@/pages/AdminUsers";
import AdminPendingPosts from "@/pages/AdminPendingPosts";
import AdminReviewedPosts from "@/pages/AdminReviewedPosts";
import AdminRequests from "@/pages/AdminRequests";
import OwnerInbox from "@/pages/OwnerInbox";

type ApprovedToolApiResponse = {
  id: number;
  name: string;
  description: string;
  screenshot: string | null;
  url: string;
  category: string;
  tags: string[];
  likes_count: number;
  status: "approved";
  approved_at: string | null;
};

type ToolInteractionsResponse = {
  likedToolIds: number[];
  favoritedToolIds: number[];
};

type ToggleLikeResponse = {
  liked: boolean;
  likesCount: number;
  message: string;
};

type ToggleFavoriteResponse = {
  favorited: boolean;
  message: string;
};

type HomeProps = {
  forcedView?: HomeView;
};

export default function Home({ forcedView }: HomeProps) {
  const navigate = useNavigate();
  const { view, setView } = useHomeView();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const { query, setQuery, filtered } = useSearch(tools);

  useEffect(() => {
    if (forcedView && forcedView !== view) {
      setView(forcedView);
    }
  }, [forcedView, setView, view]);

  useEffect(() => {
    if (!isIntroOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsIntroOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isIntroOpen]);

  useEffect(() => {
    const openIntroModal = () => setIsIntroOpen(true);
    window.addEventListener("toolora-open-project-modal", openIntroModal);

    return () => window.removeEventListener("toolora-open-project-modal", openIntroModal);
  }, []);

  useEffect(() => {
    const fetchApprovedTools = async () => {
      try {
        // Wake up the Render backend by pinging health endpoint first
        try {
          await api.get("/health", { timeout: 30000 });
        } catch (healthError) {
          console.warn("Health check failed, proceeding anyway:", healthError);
        }

        const [toolsResponse, interactionsResponse] = await Promise.all([
          api.get<ApprovedToolApiResponse[]>("/tools"),
          getAuthToken()
            ? api.get<ToolInteractionsResponse>("/tools/interactions")
            : Promise.resolve({ data: { likedToolIds: [], favoritedToolIds: [] } }),
        ]);

        const likedSet = new Set((interactionsResponse.data.likedToolIds ?? []).map(Number));
        const favoritedSet = new Set((interactionsResponse.data.favoritedToolIds ?? []).map(Number));

        const mappedTools: Tool[] = toolsResponse.data.map((tool) => ({
          id: String(tool.id),
          name: tool.name,
          description: tool.description,
          screenshot: tool.screenshot ?? "https://picsum.photos/seed/toolora/800/600",
          url: tool.url,
          category: tool.category,
          tags: tool.tags ?? [],
          likesCount: Number(tool.likes_count ?? 0),
          isLiked: likedSet.has(Number(tool.id)),
          isFavorited: favoritedSet.has(Number(tool.id)),
          status: tool.status,
          approved_at: tool.approved_at,
        }));

        setTools(mappedTools);
      } catch (error) {
        console.error("Erro ao carregar posts aprovados:", error);
        setTools([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedTools();
  }, []);

  const requireLoginForInteraction = () => {
    if (getAuthToken()) {
      return true;
    }
    toast.error("Faça login para curtir e favoritar ferramentas.");
    navigate("/login");
    return false;
  };

  const handleToggleLike = async (toolId: string) => {
    if (!requireLoginForInteraction()) return;

    const previousTool = tools.find((tool) => tool.id === toolId);
    if (!previousTool) return;

    setTools((currentTools) =>
      currentTools.map((tool) => {
        if (tool.id !== toolId) return tool;
        const nextLiked = !tool.isLiked;
        return {
          ...tool,
          isLiked: nextLiked,
          likesCount: nextLiked ? tool.likesCount + 1 : Math.max(0, tool.likesCount - 1),
        };
      })
    );

    try {
      const response = await api.post<ToggleLikeResponse>(`/tools/${toolId}/like`);
      setTools((currentTools) =>
        currentTools.map((tool) =>
          tool.id === toolId
            ? {
                ...tool,
                isLiked: Boolean(response.data.liked),
                likesCount: Number(response.data.likesCount ?? tool.likesCount),
              }
            : tool
        )
      );
    } catch {
      setTools((currentTools) =>
        currentTools.map((tool) => (tool.id === toolId ? previousTool : tool))
      );
      toast.error("Não foi possível atualizar a curtida.");
    }
  };

  const handleToggleFavorite = async (toolId: string) => {
    if (!requireLoginForInteraction()) return;

    const previousTool = tools.find((tool) => tool.id === toolId);
    if (!previousTool) return;

    setTools((currentTools) =>
      currentTools.map((tool) =>
        tool.id === toolId ? { ...tool, isFavorited: !tool.isFavorited } : tool
      )
    );

    try {
      const response = await api.post<ToggleFavoriteResponse>(`/tools/${toolId}/favorite`);
      setTools((currentTools) =>
        currentTools.map((tool) =>
          tool.id === toolId
            ? {
                ...tool,
                isFavorited: Boolean(response.data.favorited),
              }
            : tool
        )
      );
    } catch {
      setTools((currentTools) =>
        currentTools.map((tool) => (tool.id === toolId ? previousTool : tool))
      );
      toast.error("Não foi possível atualizar o favorito.");
    }
  };

  if (view === "categorias") {
    return <Categories />;
  }

  if (view === "recomendar") {
    return <Submit />;
  }

  if (view === "admin-users") {
    return <AdminUsers />;
  }

  if (view === "admin-pending-posts") {
    return <AdminPendingPosts />;
  }

  if (view === "admin-reviewed-posts") {
    return <AdminReviewedPosts />;
  }

  if (view === "admin-requests") {
    return <AdminRequests />;
  }

  if (view === "admin-inbox") {
    return <OwnerInbox />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Hero */}
      <section className="pt-32 sm:pt-36 md:pt-40 pb-16 sm:pb-24 px-4 sm:px-6 md:px-12 lg:px-16 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 sm:mb-8 text-foreground leading-tight">
            Todas as ferramentas<br />que você precisa
          </h1>
          <p className="text-base sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto mb-10 sm:mb-12 leading-relaxed">
            O diretório mais completo do Brasil para designers, devs, criadores e empreendedores
          </p>

          <div className="max-w-3xl mx-auto mb-16">
            <div className="relative">
              <Input
                placeholder="Busque por ferramenta, categoria ou palavra-chave..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-12 sm:pl-14 pr-4 sm:pr-6 py-6 sm:py-8 text-base sm:text-lg rounded-2xl border border-input bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-lg transition-colors"
              />
              <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-7 sm:w-7 text-muted-foreground" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button 
              size="lg" 
              className="w-full sm:w-auto px-6 sm:px-12 py-5 sm:py-8 text-base sm:text-xl rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.03] hover:shadow-xl transition-all duration-300 shadow-lg"
              onClick={() => setView("categorias")}
            >
              Explorar ferramentas
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto px-6 sm:px-12 py-5 sm:py-8 text-base sm:text-xl rounded-2xl border-2 border-primary text-primary hover:bg-primary/10 transition-all duration-300"
              onClick={() => setView("recomendar")}
            >
              Recomendar ferramenta
            </Button>
          </div>
        </div>
      </section>

      {isIntroOpen && (
        <div
          className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm px-4 py-8"
          onClick={() => setIsIntroOpen(false)}
        >
          <div
            className="mx-auto mt-10 w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl sm:mt-16 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Sobre a plataforma
                </p>
                <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Bem-vindo ao Toolora</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  O Toolora e um hub para descobrir, avaliar e recomendar ferramentas digitais. Tudo foi pensado para
                  voce encontrar a ferramenta certa em segundos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsIntroOpen(false)}
                className="rounded-xl border border-border bg-background p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="mb-3 inline-flex rounded-lg border border-sky-500/30 bg-sky-500/10 p-2 text-sky-300">
                  <Layers3 className="h-4 w-4" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-foreground sm:text-base">1. Explore</h3>
                <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                  Busque por categoria, nome ou tags. Os cards mostram resumo, link e status das ferramentas.
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="mb-3 inline-flex rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2 text-indigo-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-foreground sm:text-base">2. Interaja</h3>
                <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                  Curta e favorite para montar seu repertorio pessoal e destacar as ferramentas mais uteis da comunidade.
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="mb-3 inline-flex rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-foreground sm:text-base">3. Recomende</h3>
                <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                  Envie novas ferramentas para revisao. A moderacao valida e publica para manter qualidade e seguranca.
                </p>
              </article>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
              <h4 className="mb-2 text-sm font-bold text-foreground sm:text-base">Como usar melhor</h4>
              <p className="text-xs leading-6 text-muted-foreground sm:text-sm">
                Comece em "Explorar ferramentas" para descobrir opcoes, salve suas favoritas e depois use "Recomendar ferramenta"
                para contribuir com a comunidade.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de ferramentas */}
      <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-16 py-16 sm:py-24 bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-16">
          <div className="lg:col-span-9 xl:col-span-10">
            {loading ? (
              <div className="py-12 text-center text-lg text-muted-foreground">Carregando posts aprovados...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-lg text-muted-foreground">
                Ainda não há posts aprovados para exibir na vitrine.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-10 xl:gap-12">
                {filtered.map(tool => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onToggleLike={handleToggleLike}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-3 xl:col-span-2 hidden lg:block">
            <AdSidebar />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card text-muted-foreground py-16 text-center text-sm border-t border-border">
        <p>© 2026 Toolora - O hub brasileiro de ferramentas úteis</p>
        <p className="mt-3">Feito com ♥ por criadores para criadores</p>
      </footer>
    </div>
  );
}
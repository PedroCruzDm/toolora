import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/auth";
import api from "@/services/api";
import { Tool } from "@/types";
import { ToolCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
};

type ToggleFavoriteResponse = {
  favorited: boolean;
};

export default function Categories() {
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");

  useEffect(() => {
    const fetchApprovedTools = async () => {
      try {
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
      } catch {
        toast.error("Nao foi possivel carregar as categorias.");
        setTools([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedTools();
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(tools.map((tool) => tool.category).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );

    return ["Todas", ...unique];
  }, [tools]);

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tools.filter((tool) => {
      const matchesCategory = activeCategory === "Todas" || tool.category === activeCategory;

      const matchesQuery =
        !normalizedQuery ||
        tool.name.toLowerCase().includes(normalizedQuery) ||
        tool.description.toLowerCase().includes(normalizedQuery) ||
        tool.category.toLowerCase().includes(normalizedQuery) ||
        tool.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });
  }, [tools, activeCategory, query]);

  const requireLoginForInteraction = () => {
    if (getAuthToken()) {
      return true;
    }
    toast.error("Faca login para curtir e favoritar ferramentas.");
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
      toast.error("Nao foi possivel atualizar a curtida.");
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
      toast.error("Nao foi possivel atualizar o favorito.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-6 pt-28 pb-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-3xl font-black tracking-tight">Categorias</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Explore ferramentas por categoria, filtre por palavra-chave e salve suas favoritas.
          </p>

          <div className="mt-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, descricao, tag ou categoria"
              className="pl-10"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = category === activeCategory;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground">Carregando categorias...</div>
        ) : filteredTools.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhuma ferramenta encontrada para este filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTools.map((tool) => (
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
    </div>
  );
}

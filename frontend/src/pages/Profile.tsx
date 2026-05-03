import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Mail, Calendar, LogOut } from "lucide-react";
import api from "@/services/api";
import { clearAuthSession, getAuthToken, readStoredAuthUser } from "@/lib/auth";

type UserData = {
  id: number;
  name: string;
  email: string;
  profileImage?: string | null;
  created_at?: string;
};

type JwtPayload = {
  userId?: number;
  email?: string;
  name?: string;
  profileImage?: string | null;
};

type Recommendation = {
  id: number;
  name: string;
  description: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  approved_at: string | null;
};

type FavoriteTool = {
  id: number;
  name: string;
  category: string;
  url: string;
  likes_count: number;
};

type UserMessage = {
  id: number;
  senderRole: "owner" | "admin" | "moderator" | "system";
  message: string;
  messageType: "warning" | "info";
  readAt: string | null;
  createdAt: string;
};

const statusMap: Record<Recommendation["status"], { label: string; className: string }> = {
  pending: {
    label: "Em análise",
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  approved: {
    label: "Aprovada",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  rejected: {
    label: "Reprovada",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  },
};

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteTool[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = readStoredAuthUser();
    if (storedUser) {
      try {
        setUser({
          id: storedUser.id ?? 0,
          name: storedUser.name ?? "",
          email: storedUser.email ?? "",
          profileImage: storedUser.profileImage ?? null,
        });
      } catch {
        navigate("/login");
      }
    } else {
      const token = getAuthToken();
      if (!token) {
        navigate("/login");
      } else {
        try {
          const payload = JSON.parse(atob(token.split(".")[1])) as JwtPayload;
          setUser({
            id: payload.userId ?? 0,
            name: payload.name ?? "",
            email: payload.email ?? "",
            profileImage: payload.profileImage ?? null,
          });
        } catch {
          navigate("/login");
        }
      }
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoadingRecommendations(true);
      setRecommendationsError(null);

      try {
        const response = await api.get<Recommendation[]>("/tools/mine");
        setRecommendations(response.data);
      } catch {
        setRecommendationsError("Não foi possível carregar suas recomendações.");
      } finally {
        setLoadingRecommendations(false);
      }
    };

    loadRecommendations();
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      setLoadingFavorites(true);
      setFavoritesError(null);

      try {
        const response = await api.get<FavoriteTool[]>("/tools/favorites");
        setFavorites(response.data);
      } catch {
        setFavoritesError("Não foi possível carregar seus favoritos.");
      } finally {
        setLoadingFavorites(false);
      }
    };

    loadFavorites();
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      setLoadingMessages(true);
      setMessagesError(null);

      try {
        const response = await api.get<UserMessage[]>('/messages/me');
        setMessages(response.data);
      } catch {
        setMessagesError('Não foi possível carregar seus avisos.');
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Sessão inválida</h2>
            <p className="text-muted-foreground mb-6">Faça login novamente para acessar seu perfil.</p>
            <Button onClick={() => navigate("/login")} className="bg-indigo-600 hover:bg-indigo-700">
              Ir para login
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground mt-2">Visualize seus dados de conta</p>
        </div>

        <Card className="p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center overflow-hidden border border-white/10">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="text-foreground font-medium">{user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground font-medium">{user.email}</p>
              </div>
            </div>

            {user.created_at && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Membro desde</p>
                  <p className="text-foreground font-medium">
                    {new Date(user.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-6 flex gap-4">
            <Button
              onClick={() => navigate("/settings")}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              Editar Conta
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </Card>

        <Card className="p-8 mt-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Minhas Recomendações</h2>
            <p className="text-muted-foreground mt-2">Acompanhe o status das ferramentas que você enviou.</p>
          </div>

          {loadingRecommendations && (
            <div className="py-8 text-sm text-muted-foreground">Carregando recomendações...</div>
          )}

          {!loadingRecommendations && recommendationsError && (
            <div className="py-8 text-sm text-red-600 dark:text-red-400">{recommendationsError}</div>
          )}

          {!loadingRecommendations && !recommendationsError && recommendations.length === 0 && (
            <div className="py-8 text-sm text-muted-foreground">Você ainda não enviou recomendações.</div>
          )}

          {!loadingRecommendations && !recommendationsError && recommendations.length > 0 && (
            <div className="space-y-4">
              {recommendations.map((item) => (
                <div key={item.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusMap[item.status].className}`}
                    >
                      {statusMap[item.status].label}
                    </span>
                  </div>

                  {item.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}

                  {item.status === "approved" && item.approved_at && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Aprovada em {new Date(item.approved_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-8 mt-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Avisos</h2>
            <p className="text-muted-foreground mt-2">Mensagens enviadas pela moderação.</p>
          </div>

          {loadingMessages && (
            <div className="py-8 text-sm text-muted-foreground">Carregando avisos...</div>
          )}

          {!loadingMessages && messagesError && (
            <div className="py-8 text-sm text-red-600 dark:text-red-400">{messagesError}</div>
          )}

          {!loadingMessages && !messagesError && messages.length === 0 && (
            <div className="py-8 text-sm text-muted-foreground">Você não recebeu avisos.</div>
          )}

          {!loadingMessages && !messagesError && messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground capitalize">{message.senderRole}</p>
                      <p className="text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <span className="rounded-full border px-3 py-1 text-xs font-semibold text-amber-700 border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                      {message.messageType === 'warning' ? 'Aviso' : 'Info'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground leading-6">{message.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-8 mt-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Meus Favoritos</h2>
            <p className="text-muted-foreground mt-2">Ferramentas que você marcou para acessar depois.</p>
          </div>

          {loadingFavorites && (
            <div className="py-8 text-sm text-muted-foreground">Carregando favoritos...</div>
          )}

          {!loadingFavorites && favoritesError && (
            <div className="py-8 text-sm text-red-600 dark:text-red-400">{favoritesError}</div>
          )}

          {!loadingFavorites && !favoritesError && favorites.length === 0 && (
            <div className="py-8 text-sm text-muted-foreground">Você ainda não favoritou nenhuma ferramenta.</div>
          )}

          {!loadingFavorites && !favoritesError && favorites.length > 0 && (
            <div className="space-y-4">
              {favorites.map((item) => (
                <div key={item.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.likes_count} curtidas</p>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
                  >
                    Acessar ferramenta
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

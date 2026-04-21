import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trash2, AlertTriangle } from "lucide-react";

type UserData = {
  id: number;
  name: string;
  email: string;
};

type JwtPayload = {
  userId?: number;
  email?: string;
  name?: string;
};

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setName(userData.name);
        setEmail(userData.email);
      } catch {
        navigate("/login");
      }
    } else {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
      } else {
        try {
          const payload = JSON.parse(atob(token.split(".")[1])) as JwtPayload;
          const fallbackUser: UserData = {
            id: payload.userId ?? 0,
            name: payload.name ?? "",
            email: payload.email ?? "",
          };

          setUser(fallbackUser);
          setName(fallbackUser.name);
          setEmail(fallbackUser.email);
        } catch {
          navigate("/login");
        }
      }
    }
    setLoading(false);
  }, [navigate]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error("Nome e email são obrigatórios.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
      };

      if (newPassword) {
        payload.currentPassword = password;
        payload.newPassword = newPassword;
      }

      const response = await api.put(`/auth/user/${user?.id}`, payload);

      const updatedUser = response.data.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Conta atualizada com sucesso!");
      navigate("/profile");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível atualizar a conta."
        : "Não foi possível atualizar a conta.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePhrase = user ? `deletar conta ${user.email}` : "";

  const handleDeleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (deleteConfirmation.trim().toLowerCase() !== deletePhrase.toLowerCase()) {
      toast.error(`Confirmação inválida. Digite exatamente: ${deletePhrase}`);
      return;
    }

    if (!deletePassword.trim()) {
      toast.error("Digite sua senha para deletar a conta.");
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/auth/user/${user?.id}`, {
        data: { password: deletePassword },
      });

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast.success("Conta deletada com sucesso.");
      navigate("/");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível deletar a conta."
        : "Não foi possível deletar a conta.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
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
            <p className="text-muted-foreground mb-6">Faça login novamente para editar sua conta.</p>
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
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">Editar Conta</h1>
          <p className="text-muted-foreground mt-2">Atualize seus dados de perfil</p>
        </div>

        <Card className="p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                Nome
              </label>
              <Input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <Input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu email"
                className="w-full"
              />
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Alterar Senha (Opcional)</h3>

              <div className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                    Senha Atual
                  </label>
                  <Input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha atual"
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">
                    Nova Senha
                  </label>
                  <Input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha"
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                    Confirmar Nova Senha
                  </label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6 flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Button
                type="button"
                onClick={() => navigate("/profile")}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-8 mt-8 border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-start gap-3 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">Zona de perigo</h2>
              <p className="text-sm text-red-700/90 dark:text-red-300/90 mt-1">
                Esta ação é irreversível. Para confirmar, digite:
              </p>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200 mt-1">
                {`deletar conta ${user.email}`}
              </p>
            </div>
          </div>

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div>
              <label htmlFor="delete-confirmation" className="block text-sm font-medium text-foreground mb-2">
                Confirmação
              </label>
              <Input
                id="delete-confirmation"
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={`deletar conta ${user.email}`}
              />
            </div>

            <div>
              <label htmlFor="delete-password" className="block text-sm font-medium text-foreground mb-2">
                Sua senha
              </label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Digite sua senha"
              />
            </div>

            <Button
              type="submit"
              disabled={isDeleting}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "Deletando conta..." : "Deletar conta"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

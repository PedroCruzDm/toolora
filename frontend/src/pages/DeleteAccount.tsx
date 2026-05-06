import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Trash2 } from "lucide-react";
import { clearAuthSession } from "@/lib/auth";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";

type UserData = {
  id: number;
  name: string;
  email: string;
};

export default function DeleteAccount() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user: authUser, ready } = useAuthBootstrap();

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!authUser) {
      navigate("/login");
      setLoading(false);
      return;
    }

    setUser({
      id: Number(authUser.id) || 0,
      name: authUser.name,
      email: authUser.email,
    });
    setLoading(false);
  }, [navigate]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (confirmation !== "DELETAR CONTA") {
      toast.error("Digite 'DELETAR CONTA' para confirmar.");
      return;
    }

    if (!password.trim()) {
      toast.error("Digite sua senha para confirmar a exclusão.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.delete(`/auth/user/${user?.id}`, {
        data: { password },
      });

      clearAuthSession();

      toast.success("Conta deletada com sucesso.");
      navigate("/");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível deletar a conta."
        : "Não foi possível deletar a conta.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
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
    return null;
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
          <h1 className="text-4xl font-bold text-red-600">Deletar Conta</h1>
          <p className="text-muted-foreground mt-2">Esta ação é permanente e irreversível</p>
        </div>

        <Card className="p-8 border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-start gap-4 mb-6">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                Atenção: Zona de Perigo
              </h3>
              <p className="text-red-800 dark:text-red-400 text-sm">
                Ao deletar sua conta, todos os seus dados serão removidos permanentemente do nosso sistema.
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-4 rounded border border-red-200 dark:border-red-900/40">
              <p className="text-sm text-foreground mb-2">
                <span className="font-semibold">Email da conta:</span> {user.email}
              </p>
              <p className="text-sm text-muted-foreground">
                Para confirmar a exclusão, você precisará digitar "DELETAR CONTA" abaixo e informar sua senha.
              </p>
            </div>

            <div>
              <label htmlFor="confirmation" className="block text-sm font-medium text-foreground mb-2">
                Digite "DELETAR CONTA" para confirmar
              </label>
              <Input
                type="text"
                id="confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETAR CONTA"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Sua Senha
              </label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full"
              />
            </div>

            <div className="border-t border-border pt-6 flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting || confirmation !== "DELETAR CONTA"}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isSubmitting ? "Deletando..." : "Deletar Conta Permanentemente"}
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
      </div>
    </div>
  );
}

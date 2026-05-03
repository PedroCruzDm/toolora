import { FormEvent, useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trash2, AlertTriangle, Upload, X } from "lucide-react";
import { clearAuthSession, getAuthToken, readStoredAuthUser, updateAuthUser } from "@/lib/auth";

type UserData = {
  id: number;
  name: string;
  email: string;
  profileImage?: string | null;
};

type JwtPayload = {
  userId?: number;
  email?: string;
  name?: string;
  profileImage?: string | null;
};

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState<string>("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasProfileImage = Boolean(profileImage.trim());

  const isSupportedImageFile = (file: File) => {
    if (file.type.startsWith("image/")) return true;

    const lowerName = file.name.toLowerCase();
    return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].some((extension) =>
      lowerName.endsWith(extension)
    );
  };

  useEffect(() => {
    const storedUser = readStoredAuthUser();
    if (storedUser) {
      try {
        const userData = {
          id: storedUser.id ?? 0,
          name: storedUser.name ?? "",
          email: storedUser.email ?? "",
          profileImage: storedUser.profileImage ?? null,
        };
        setUser(userData);
        setName(userData.name ?? "");
        setEmail(userData.email ?? "");
        setProfileImage(userData.profileImage ?? "");
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
          const fallbackUser: UserData = {
            id: payload.userId ?? 0,
            name: payload.name ?? "",
            email: payload.email ?? "",
            profileImage: payload.profileImage ?? null,
          };

          setUser(fallbackUser);
          setName(fallbackUser.name);
          setEmail(fallbackUser.email);
          setProfileImage(fallbackUser.profileImage ?? "");
        } catch {
          navigate("/login");
        }
      }
    }
    setLoading(false);
  }, [navigate]);

  const uploadProfileImage = async (file: File) => {
    if (!isSupportedImageFile(file)) {
      toast.error("Envie apenas imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post<{ url: string }>("/tools/upload-image", formData, {
      });

      setProfileImage(response.data.url);
      toast.success("Foto de perfil enviada.");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível enviar a imagem."
        : "Não foi possível enviar a imagem.";
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleProfileImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadProfileImage(file);
    event.target.value = "";
  };

  const handleProfileImagePaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items ?? [];
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;
      event.preventDefault();
      await uploadProfileImage(file);
      return;
    }
  };

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
        profileImage: profileImage.trim() ? profileImage.trim() : null,
      };

      if (newPassword) {
        payload.currentPassword = password;
        payload.newPassword = newPassword;
      }

      const response = await api.put(`/auth/user/${user?.id}`, payload);

      const updatedUser = response.data.user;
      updateAuthUser(updatedUser);

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

      clearAuthSession();
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
            <div
              className="rounded-2xl border border-border bg-card/70 p-4 space-y-4"
              onPaste={handleProfileImagePaste}
              tabIndex={0}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Foto de perfil
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Envie um arquivo local ou cole um print. A foto será salva no seu perfil.
                  </p>
                </div>
                {profileImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setProfileImage("")}
                    className="text-xs"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>

              <div className="grid gap-4">
                <div className="overflow-hidden rounded-2xl border border-border bg-black/5 dark:bg-white/5">
                  {hasProfileImage ? (
                    <img
                      src={profileImage}
                      alt={name || "Foto de perfil"}
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      Nenhuma foto aplicada ainda. Envie um arquivo, cole um print ou adicione um link.
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploadingImage ? "Enviando..." : "Escolher imagem"}
                  </Button>

                  {hasProfileImage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setProfileImage("")}
                      className="text-xs"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  ) : (
                    <Input
                      type="text"
                      value={profileImage}
                      onChange={(e) => setProfileImage(e.target.value)}
                      placeholder="Ou cole um link de imagem"
                      className="min-w-[240px] flex-1"
                    />
                  )}
                </div>
              </div>

              {hasProfileImage && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Foto pronta para salvar.
                </p>
              )}
            </div>

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

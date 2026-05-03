import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type RequestResetResponse = {
  message: string;
  resetCode: string;
  resetUrl: string;
  expiresInMinutes: number;
};

type ResetResponse = {
  message: string;
};

function copyToClipboard(value: string) {
  if (!value.trim()) return;
  void navigator.clipboard?.writeText(value);
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const initialCode = searchParams.get("code") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [resetCode, setResetCode] = useState(initialCode);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestCode, setRequestCode] = useState("");
  const [requestUrl, setRequestUrl] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [step, setStep] = useState<"request" | "verify">(initialCode ? "verify" : "request");

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialCode) setResetCode(initialCode);
    if (initialCode) setStep("verify");
  }, [initialEmail, initialCode]);

  const canReset = useMemo(
    () => Boolean(email.trim() && resetCode.trim() && newPassword.trim() && confirmPassword.trim()),
    [email, resetCode, newPassword, confirmPassword]
  );

  const handleRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Digite seu email para recuperar a senha.");
      return;
    }

    setIsRequesting(true);
    try {
      const response = await api.post<RequestResetResponse>("/auth/password-reset/request", {
        email: email.trim(),
      });

      setRequestCode(response.data.resetCode);
      setRequestUrl(response.data.resetUrl);
      setExpiresInMinutes(response.data.expiresInMinutes);
      setResetCode(response.data.resetCode);
      setSearchParams({ email: email.trim(), code: response.data.resetCode });
      setStep("verify");
      toast.success("Código de recuperação gerado.");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.status === 404
          ? "Endpoint de recuperação não encontrado no backend atual. Atualize/redeploy o backend."
          : error.response?.data?.error ?? "Não foi possível gerar o código agora."
        : "Não foi possível gerar o código agora.";
      toast.error(message);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !resetCode.trim() || !newPassword.trim()) {
      toast.error("Preencha email, código e nova senha.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    setIsResetting(true);
    try {
      await api.post<ResetResponse>("/auth/password-reset/confirm", {
        email: email.trim(),
        code: resetCode.trim(),
        password: newPassword,
      });

      toast.success("Senha redefinida com sucesso.");
      navigate("/login");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível redefinir a senha agora."
        : "Não foi possível redefinir a senha agora.";
      toast.error(message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 pb-16 pt-36 text-foreground">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Esqueci minha senha</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
            Primeiro informe seu email. Depois de receber o código por email, use-o para definir uma nova senha.
          </p>
        </div>

        <Card className="space-y-8 p-8 shadow-xl sm:p-10">
          <form className="space-y-5" onSubmit={handleRequestReset}>
            <div className="space-y-2">
              <label htmlFor="recover-email" className="block text-sm font-semibold text-foreground">Email da conta</label>
              <Input
                id="recover-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isRequesting}>
              {isRequesting ? "Gerando código..." : "Gerar código de recuperação"}
            </Button>
          </form>

          {step === "verify" && (requestCode || initialCode || resetCode) && (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Código de recuperação</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Verifique sua caixa de entrada. Se necessário, copie o código abaixo para concluir a redefinição.
                  {expiresInMinutes ? ` Ele expira em ${expiresInMinutes} minutos.` : null}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <code className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold tracking-[0.2em] text-foreground">
                  {requestCode || resetCode}
                </code>
                <Button type="button" variant="outline" onClick={() => copyToClipboard(requestCode || resetCode)}>
                  Copiar código
                </Button>
                {requestUrl && (
                  <Button type="button" variant="ghost" onClick={() => copyToClipboard(requestUrl)}>
                    Copiar link
                  </Button>
                )}
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleResetPassword}>
            {step === "verify" ? (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="reset-code" className="block text-sm font-semibold text-foreground">Código de 6 caracteres</label>
                    <Input
                      id="reset-code"
                      value={resetCode}
                      onChange={(event) => setResetCode(event.target.value.toUpperCase().slice(0, 6))}
                      placeholder="ABC123"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="reset-password" className="block text-sm font-semibold text-foreground">Nova senha</label>
                    <Input
                      id="reset-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Digite a nova senha"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="block text-sm font-semibold text-foreground">Confirmar nova senha</label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isResetting || !canReset}>
                  {isResetting ? "Redefinindo..." : "Redefinir senha"}
                </Button>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                Depois que o email chegar, a área para digitar o código de 6 caracteres e criar a nova senha aparecerá aqui.
              </div>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Lembrou a senha? <Link to="/login" className="font-semibold text-primary hover:underline">Voltar para o login</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

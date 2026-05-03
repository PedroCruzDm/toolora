// src/pages/Submit.tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { motion } from "framer-motion";
import { Link as LinkIcon, Pencil } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ClipboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { notifySuccess, notifyError } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { FloatingTextarea } from "@/components/ui/FloatingTextarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagsInput } from "@/components/ui/TagsInput";
import { getAuthToken } from "@/lib/auth";
import api from "@/services/api";

const categories = [
  "Edição de Imagem",
  "Design Gráfico",
  "Produtividade",
  "Ferramentas de PDF",
  "Compressores e Conversores",
  "Inteligência Artificial",
  "Edição de Vídeo",
  "Áudio e Música",
  "Finanças Pessoais",
  "Organização e Notas",
  "Geradores e Utilitários",
  "Aprendizado e Idiomas",
  "Saúde e Bem-Estar",
  "Marketing e Redes Sociais",
  "Desenvolvimento e Código",
  "Outros",
];

// Sistema de Tags - tags são array de strings
const schema = z.object({
  name: z.string().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  url: z.string().url("Link inválido").startsWith("https://", "O link deve começar com https://"),
  screenshot: z.union([
    z.literal(""),
    z.string().url("Link da imagem inválido"),
  ]),
  category: z.string().min(2, "Selecione uma categoria"),
  tags: z.array(z.string().min(2)).max(10, "Máximo 10 tags").optional(),
  description: z.string().min(30, "Descreva melhor a ferramenta (mínimo 30 caracteres)").max(800, "Descrição muito longa"),
});

type FormData = z.infer<typeof schema>;

export default function Submit() {
  const navigate = useNavigate();
  const isLogged = Boolean(getAuthToken());
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      url: "",
      screenshot: "",
      category: "",
      tags: [],
      description: "",
    },
  });

  const screenshotValue = watch("screenshot");
  const hasScreenshot = Boolean(screenshotValue?.trim());

  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      notifyError("Envie apenas arquivo de imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notifyError("A imagem deve ter no máximo 5MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post<{ url: string }>("/tools/upload-image", formData);

      setValue("screenshot", response.data.url, { shouldDirty: true, shouldValidate: true });
      notifySuccess("Imagem enviada com sucesso.");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível enviar a imagem."
        : "Não foi possível enviar a imagem.";
      notifyError(message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLocalImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
    event.target.value = "";
  };

  const handlePasteImage = async (event: ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items ?? [];
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;
      event.preventDefault();
      await uploadImageFile(file);
      return;
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/tools", {
        name: data.name,
        url: data.url,
        screenshot: data.screenshot.trim() ? data.screenshot.trim() : null,
        category: data.category,
        description: data.description,
        tags: data.tags ?? [],
      });

      notifySuccess("Recomendação enviada com sucesso!", {
        description: "Nossa equipe vai analisar em até 48 horas. Obrigado!",
        duration: 5000,
      });

      reset();
      navigate("/");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível enviar sua recomendação."
        : "Não foi possível enviar sua recomendação.";

      notifyError(message);
    }
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="bg-card rounded-2xl shadow-xl p-10 flex flex-col gap-6 max-w-md w-full border border-border text-center">
          <h2 className="text-2xl font-bold mb-2">Faça login ou crie uma conta</h2>
          <p className="text-muted-foreground mb-6">Para recomendar uma ferramenta, você precisa estar logado.</p>
          <div className="flex flex-col gap-4">
            <Button onClick={() => navigate("/login")} variant="outline" className="w-full text-primary">Entrar</Button>
            <Button onClick={() => navigate("/cadastro")} className="w-full">Criar conta</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-20 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-2xl bg-card rounded-3xl shadow-2xl border border-border p-10 md:p-14 space-y-12"
      >
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Recomende uma ferramenta
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Nossa equipe revisa todas as sugestões em até 48 horas. Obrigado por contribuir!
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <FloatingInput
            {...register("name")}
            label="Nome da ferramenta"
            icon={<Pencil className="h-5 w-5" />}
            error={errors.name?.message}
          />

          <FloatingInput
            {...register("url")}
            label="Link da ferramenta (https://...)"
            icon={<LinkIcon className="h-5 w-5" />}
            error={errors.url?.message}
          />

          <div
            className="space-y-3 rounded-xl border border-input bg-background/70 p-4"
            onPaste={handlePasteImage}
            tabIndex={0}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Imagem do post</p>
                <p className="text-xs text-muted-foreground">
                  Envie um arquivo local, cole um print ou cole um link. Depois de anexada, a URL não aparece mais no campo.
                </p>
              </div>
              {hasScreenshot && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setValue("screenshot", "", { shouldDirty: true, shouldValidate: true })}
                  className="text-xs"
                >
                  Remover
                </Button>
              )}
            </div>

            {!hasScreenshot ? (
              <div className="grid gap-3">
                <div className="relative">
                  <Input
                    {...register("screenshot")}
                    placeholder="Cole um link de imagem ou envie um arquivo"
                    className="peer h-14 px-5 pt-6 pb-2 bg-background border border-input rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                  <LinkIcon className="absolute right-5 top-4 h-5 w-5 text-muted-foreground peer-focus:text-primary transition-colors" />
                </div>
                {errors.screenshot && <p className="text-sm text-destructive mt-1.5">{errors.screenshot.message}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border border-border bg-black/5 dark:bg-white/5">
                  <img
                    src={screenshotValue}
                    alt="Preview da imagem anexada"
                    className="h-48 w-full object-cover"
                  />
                </div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Imagem anexada com sucesso.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLocalImageChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? "Enviando imagem..." : "Selecionar imagem"}
              </Button>
              <p className="text-xs text-muted-foreground self-center">
                Você também pode clicar dentro da área e colar com Ctrl+V.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Categoria</label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-14 rounded-xl bg-background border border-input px-5">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tags</label>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagsInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  maxTags={10}
                />
              )}
            />
            {errors.tags && <p className="text-sm text-destructive">{errors.tags.message}</p>}
          </div>

          <FloatingTextarea
            {...register("description")}
            label="Descrição da ferramenta"
            icon={<Pencil className="h-5 w-5" />}
            rows={8}
            error={errors.description?.message}
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-7 text-lg font-semibold rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 shadow-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </span>
            ) : (
              "Enviar para análise"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
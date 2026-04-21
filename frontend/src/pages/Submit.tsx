// src/pages/Submit.tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { motion } from "framer-motion";
import { Link as LinkIcon, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagsInput } from "@/components/ui/TagsInput";
import { Textarea } from "@/components/ui/textarea";
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
  category: z.string().min(2, "Selecione uma categoria"),
  tags: z.array(z.string().min(2)).max(10, "Máximo 10 tags").optional(),
  description: z.string().min(30, "Descreva melhor a ferramenta (mínimo 30 caracteres)").max(800, "Descrição muito longa"),
});

type FormData = z.infer<typeof schema>;

export default function Submit() {
  const navigate = useNavigate();
  const isLogged = Boolean(localStorage.getItem("token"));

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      url: "",
      category: "",
      tags: [],
      description: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post("/tools", {
        name: data.name,
        url: data.url,
        category: data.category,
        description: data.description,
        tags: data.tags ?? [],
      });

      toast.success("✅ Recomendação enviada com sucesso!", {
        description: "Nossa equipe vai analisar em até 48 horas. Obrigado!",
        duration: 5000,
      });

      reset();
      navigate("/");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error ?? "Não foi possível enviar sua recomendação."
        : "Não foi possível enviar sua recomendação.";

      toast.error(message);
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
          <div className="relative">
            <Input
              {...register("name")}
              placeholder=" "
              className="peer h-14 px-5 pt-6 pb-2 bg-background border border-input rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
            <label className="absolute left-5 top-4 text-sm text-muted-foreground peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary transition-all pointer-events-none">
              Nome da ferramenta
            </label>
            <Pencil className="absolute right-5 top-4 h-5 w-5 text-muted-foreground peer-focus:text-primary transition-colors" />
            {errors.name && <p className="text-sm text-destructive mt-1.5">{errors.name.message}</p>}
          </div>

          <div className="relative">
            <Input
              {...register("url")}
              placeholder=" "
              className="peer h-14 px-5 pt-6 pb-2 bg-background border border-input rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
            <label className="absolute left-5 top-4 text-sm text-muted-foreground peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary transition-all pointer-events-none">
              Link da ferramenta (https://...)
            </label>
            <LinkIcon className="absolute right-5 top-4 h-5 w-5 text-muted-foreground peer-focus:text-primary transition-colors" />
            {errors.url && <p className="text-sm text-destructive mt-1.5">{errors.url.message}</p>}
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

          <div className="relative">
            <Textarea
              {...register("description")}
              placeholder=" "
              rows={8}
              className="peer min-h-[180px] px-5 pt-6 pb-2 bg-background border border-input rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y outline-none"
            />
            <label className="absolute left-5 top-4 text-sm text-muted-foreground peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary transition-all pointer-events-none">
              Descrição da ferramenta
            </label>
            <Pencil className="absolute right-5 top-4 h-5 w-5 text-muted-foreground peer-focus:text-primary transition-colors" />
            {errors.description && <p className="text-sm text-destructive mt-1.5">{errors.description.message}</p>}
          </div>

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
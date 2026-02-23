import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  url: z.string().url("Link inválido"),
  description: z.string().min(30, "Descreva melhor a ferramenta"),
  category: z.string().min(1, "Escolha uma categoria"),
});

type FormData = z.infer<typeof schema>;

export default function Submit() {
  const { register, handleSubmit, setValue, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    console.log("Submissão:", data);
    toast.success("✅ Enviado com sucesso! Vamos analisar em até 48h.");
    reset();
  };

  return (
    <div className="max-w-2xl mx-auto py-16 px-6">
      <h1 className="text-4xl font-bold mb-2">Recomende uma ferramenta</h1>
      <p className="text-gray-600 mb-10">Nossa equipe vai revisar em até 48 horas</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div>
          <label className="text-sm font-medium">Seu e-mail</label>
          <Input {...register("email")} placeholder="voce@email.com" type="email" />
        </div>

        <div>
          <label className="text-sm font-medium">Link da ferramenta</label>
          <Input {...register("url")} placeholder="https://exemplo.com" type="url" />
        </div>

        <div>
          <label className="text-sm font-medium">Descrição</label>
          <Textarea {...register("description")} placeholder="Descreva a ferramenta..." rows={6} />
        </div>

        <div>
          <label className="text-sm font-medium">Categoria</label>
          <Select onValueChange={(v) => setValue("category", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Edição de Imagens">Edição de Imagens</SelectItem>
              <SelectItem value="Design">Design UI/UX</SelectItem>
              <SelectItem value="Produtividade">Produtividade</SelectItem>
              <SelectItem value="IA">Inteligência Artificial</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Desenvolvimento">Desenvolvimento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" size="lg" className="w-full text-lg py-7">
          Enviar para análise
        </Button>
      </form>
    </div>
  );
}
import { ToolCard } from "@/components/ui/card";
import AdSidebar from "@/components/AdSidebar";
import { Tool } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";

const tools: Tool[] = [
  {
    id: "1",
    name: "Canva",
    description: "Crie designs incríveis em minutos com milhares de templates gratuitos.",
    screenshot: "https://picsum.photos/id/1015/800/600",
    url: "https://canva.com",
    category: "Design Gráfico",
    tags: ["design", "gratuito", "templates"],
    likesCount: 1243,
    status: "approved",
    approved_at: null,
  },
  {
    id: "2",
    name: "Figma",
    description: "A melhor ferramenta de design colaborativo do mundo.",
    screenshot: "https://picsum.photos/id/106/800/600",
    url: "https://figma.com",
    category: "Design Gráfico",
    tags: ["ui", "prototipação", "colaborativo"],
    likesCount: 987,
    status: "approved",
    approved_at: null,
  },
  {
    id: "uiverse",
    name: "Uiverse",
    description: "Biblioteca gratuita com centenas de componentes UI prontos em HTML + CSS puro (cards, botões, loaders, toggles, etc.). Ótimo para inspiração rápida e copy-paste.",
    screenshot: "https://api.microlink.io/?url=https://uiverse.io/&screenshot=true&embed=screenshot.url", // screenshot oficial ou use um gerado
    url: "https://uiverse.io/",
    category: "Desenvolvimento e Código",
    tags: ["componentes", "css", "ui"],
    likesCount: 8420,
    status: "approved",
    approved_at: null,
  },
  {
    id: "replit",
    name: "Replit",
    description: "Ambiente online completo para criar, rodar e compartilhar projetos em várias linguagens. Ideal para protótipos rápidos, testes e aprendizado sem instalar nada.",
    screenshot: "https://api.microlink.io/?url=https://replit.com/&screenshot=true&embed=screenshot.url",
    url: "https://replit.com/",
    category: "Desenvolvimento e Código",
    tags: ["online", "dev", "ia"],
    likesCount: 15670,
    status: "approved",
    approved_at: null,
  },
  {
    id: "neumorphism",
    name: "Neumorphism.io",
    description: "Gerador de paleta e sombras no estilo neumorphism (soft UI). Permite customizar cores, bordas e sombras e copiar o CSS pronto em segundos.",
    screenshot: "https://api.microlink.io/?url=https://neumorphism.io/&screenshot=true&embed=screenshot.url",
    url: "https://neumorphism.io/",
    category: "Geradores e Utilitários",
    tags: ["ui", "gerador", "css"],
    likesCount: 6210,
    status: "approved",
    approved_at: null,
  },
  {
    id: "cssgradient",
    name: "CSS Gradient",
    description: "Ferramenta simples e poderosa para criar gradientes CSS lindos. Escolha cores, direção, tipo (linear/radial) e copie o código diretamente.",
    screenshot: "https://api.microlink.io/?url=https://cssgradient.io/&screenshot=true&embed=screenshot.url",
    url: "https://cssgradient.io/",
    category: "Geradores e Utilitários",
    tags: ["gradiente", "css", "gerador"],
    likesCount: 9840,
    status: "approved",
    approved_at: null,
  },
  // adicione mais ferramentas mock aqui se quiser
];

export default function Home() {
  const { query, setQuery, filtered } = useSearch(tools);
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Hero */}
      <section className="pt-40 pb-24 px-6 md:px-12 lg:px-16 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 text-foreground">
            Todas as ferramentas<br />que você precisa
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto mb-12 leading-relaxed">
            O diretório mais completo do Brasil para designers, devs, criadores e empreendedores
          </p>

          <div className="max-w-3xl mx-auto mb-16">
            <div className="relative">
              <Input
                placeholder="Busque por ferramenta, categoria ou palavra-chave..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-14 pr-6 py-8 text-lg rounded-2xl border border-input bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-lg transition-colors"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button 
              size="lg" 
              className="px-12 py-8 text-xl rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.03] hover:shadow-xl transition-all duration-300 shadow-lg"
            >
              Explorar ferramentas
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-12 py-8 text-xl rounded-2xl border-2 border-primary text-primary hover:bg-primary/10 transition-all duration-300"
            >
              Recomendar ferramenta
            </Button>
          </div>
        </div>
      </section>

      {/* Lista de ferramentas */}
      <section className="max-w-screen-2xl mx-auto px-6 lg:px-12 xl:px-16 py-24 bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-16">
          <div className="lg:col-span-9 xl:col-span-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-10 xl:gap-12">
              {filtered.map(tool => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
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
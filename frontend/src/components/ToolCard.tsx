import { Heart, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tool } from "@/types";

export default function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border border-gray-100">
      <div className="relative">
        <img 
          src={tool.screenshot} 
          alt={tool.name}
          className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
          {tool.category}
        </div>
      </div>

      <CardHeader>
        <CardTitle className="flex justify-between items-start text-xl">
          {tool.name}
          <button className="text-red-500 hover:scale-125 transition flex flex-col items-center -mt-1">
            <Heart className="w-5 h-5 fill-current" />
            <span className="text-[10px] text-gray-500">{tool.likesCount}</span>
          </button>
        </CardTitle>
        <CardDescription className="line-clamp-3 text-base leading-relaxed">
          {tool.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button asChild className="w-full text-base py-6 rounded-xl">
          <a href={tool.url} target="_blank" rel="noopener noreferrer">
            Acessar ferramenta <ExternalLink className="ml-2 w-5 h-5" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
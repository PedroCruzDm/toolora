
import * as React from "react";
import { cn } from "@/lib/utils";
import { Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tool } from "@/types";

// Card primitives
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

// ToolCard component
interface ToolCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tool: Tool;
}

const ToolCard = React.forwardRef<HTMLDivElement, ToolCardProps>(
  ({ className, tool, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "overflow-hidden group hover:shadow-2xl transition-all duration-300 border border-border bg-card rounded-3xl",
          className
        )}
        {...props}
      >
        {/* Imagem */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <img
            src={tool.screenshot}
            alt={tool.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-5 right-5 px-4 py-1.5 bg-black/60 dark:bg-gray-800/70 backdrop-blur-md text-white dark:text-gray-100 text-sm font-medium rounded-full">
            {tool.category}
          </div>
          <div className="absolute top-5 left-5 flex items-center gap-2 px-4 py-1.5 bg-black/60 dark:bg-gray-800/70 backdrop-blur-md text-white dark:text-gray-100 text-sm font-medium rounded-full">
            <Heart className="h-4 w-4 fill-red-500 stroke-red-500" />
            {tool.likesCount.toLocaleString()}
          </div>
        </div>

        <div className="p-7 space-y-5">
          <h3 className="text-2xl font-bold leading-tight text-foreground line-clamp-2">
            {tool.name}
          </h3>
          <p className="text-base leading-relaxed text-muted-foreground line-clamp-3">
            {tool.description}
          </p>
          <Button
            asChild
            className="w-full mt-4 py-7 text-lg font-medium rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 shadow-md"
          >
            <a href={tool.url} target="_blank" rel="noopener noreferrer">
              Visitar site <ExternalLink className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      </Card>
    );
  }
);
ToolCard.displayName = "ToolCard";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, ToolCard };

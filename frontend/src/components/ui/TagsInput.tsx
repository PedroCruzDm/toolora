import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type TagsInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
};

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

export function TagsInput({
  value,
  onChange,
  placeholder = "Adicione tags (ex: ia, gratuito, online) e pressione Enter",
  maxTags = 10,
  className,
}: TagsInputProps) {
  const [draft, setDraft] = useState("");

  const tags = useMemo(
    () => value.map(normalizeTag).filter(Boolean),
    [value]
  );

  const commitTag = (rawTag: string) => {
    const nextTag = normalizeTag(rawTag);

    if (!nextTag) return;
    if (nextTag.length < 2) return;
    if (tags.includes(nextTag)) return;
    if (tags.length >= maxTags) return;

    onChange([...tags, nextTag]);
    setDraft("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitTag(draft);
    }

    if (event.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span
            key={tag}
            className="text-xs px-3 py-1 rounded-2xl bg-primary/10 text-primary font-medium flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-primary/15 transition-colors"
              aria-label={`Remover tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <Input
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commitTag(draft)}
        placeholder={placeholder}
        className="h-14 px-5 rounded-xl bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        aria-label="Campo de tags"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Digite uma tag e pressione Enter ou vírgula.</span>
        <span>{tags.length}/{maxTags}</span>
      </div>
    </div>
  );
}
import { useState, useMemo } from "react";
import { Tool } from "@/types";

export function useSearch(tools: Tool[]) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return tools;
    const lower = query.toLowerCase();
    return tools.filter(tool =>
      tool.name.toLowerCase().includes(lower) ||
      tool.description.toLowerCase().includes(lower) ||
      tool.category.toLowerCase().includes(lower)
    );
  }, [query, tools]);

  return { query, setQuery, filtered };
}

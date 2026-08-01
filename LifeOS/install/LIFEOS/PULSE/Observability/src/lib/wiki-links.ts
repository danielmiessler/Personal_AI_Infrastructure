export function wikiPageUrl(category: string, slug: string): string {
  if (category === "system-doc") return `/docs?doc=${slug}`;
  return `/memory/knowledge?category=${category}&slug=${slug}`;
}

export const WIKI_GRAPH_URL = `/memory/graph`;

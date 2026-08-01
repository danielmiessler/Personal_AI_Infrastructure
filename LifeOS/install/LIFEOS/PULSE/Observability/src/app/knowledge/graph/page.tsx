"use client";

// Legacy route — the knowledge graph merged into the memory graph (2026-07-19).
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KnowledgeGraphLegacyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/memory/graph");
  }, [router]);

  return null;
}

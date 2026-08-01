"use client";

// Legacy route — knowledge moved under memory (2026-07-19). Preserves query
// params so old deep links (?category=X&slug=Y) keep resolving.
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function KnowledgeLegacyRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const qs = params.toString();
    router.replace(`/memory/knowledge${qs ? `?${qs}` : ""}`);
  }, [router, params]);

  return null;
}

export default function KnowledgeLegacyPage() {
  return (
    <Suspense fallback={null}>
      <KnowledgeLegacyRedirect />
    </Suspense>
  );
}

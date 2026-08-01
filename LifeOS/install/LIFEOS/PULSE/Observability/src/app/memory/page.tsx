"use client";

// /memory lands on the knowledge wiki — the section's default child.
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function MemoryIndexRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const qs = params.toString();
    router.replace(`/memory/knowledge${qs ? `?${qs}` : ""}`);
  }, [router, params]);

  return null;
}

export default function MemoryIndexPage() {
  return (
    <Suspense fallback={null}>
      <MemoryIndexRedirect />
    </Suspense>
  );
}

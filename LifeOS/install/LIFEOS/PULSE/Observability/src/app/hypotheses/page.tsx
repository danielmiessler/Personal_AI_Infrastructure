"use client";

// /hypotheses folded into /upgrades (2026-07-23): the deriver's pending
// hypotheses now appear in the unified Upgrades queue as source=autonomous.
// This route survives only as a redirect so old links and muscle memory work.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HypothesesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/upgrades");
  }, [router]);
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-ink-3 text-sm">
        Hypotheses moved — redirecting to /upgrades…
      </div>
    </div>
  );
}

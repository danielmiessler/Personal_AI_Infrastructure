"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** The Assets tab became Gear (2026-07-16). Old links land here and forward. */
export default function AssetsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/gear");
  }, [router]);
  return null;
}

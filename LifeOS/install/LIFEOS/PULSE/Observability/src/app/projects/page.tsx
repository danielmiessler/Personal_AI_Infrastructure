import { redirect } from "next/navigation";

/**
 * /projects folded into the Work hub (2026-07-19) — projects are areas (tabs)
 * under /work now. Kept as a redirect so old links and muscle memory land right.
 */
export default function ProjectsRedirect() {
  redirect("/work?tab=live");
}

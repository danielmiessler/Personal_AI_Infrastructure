#!/usr/bin/env bun
/**
 * FetchCrime — delegates to a dedicated crime-stats skill.
 *
 * Per ISA constraint ISC-12: this fetcher MUST NOT call CitizenRIMS, FBI UCR,
 * AreaVibes, or any crime-data source directly. All crime data routes through
 * the crime-stats skill.
 *
 * v1: returns source_status="unavailable" with a TODO marker pointing at the
 * delegation contract. The real implementation will spawn the crime-stats skill
 * via the Skill mechanism (or its CLI tool when one is added) and shape the output.
 */

import type { FetchResult, Hometown } from "./Types.ts"
import { unavailable } from "./Types.ts"

export async function fetchCrime(home: Hometown): Promise<FetchResult> {
  return unavailable(
    `crime fetcher not yet implemented — TODO: delegate to the crime-stats skill's QuickStats for ${home.city}, ${home.state}; never call CitizenRIMS/FBI/AreaVibes from here`
  )
}

if (import.meta.main) {
  const { readHometown } = await import("./Hometown.ts")
  const home = await readHometown()
  console.log(JSON.stringify(await fetchCrime(home), null, 2))
}

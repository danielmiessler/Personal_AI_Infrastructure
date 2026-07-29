"use client";

/**
 * The TELOS landing page on mobile: a card per section, nothing else.
 *
 * This replaces the twelve-section scroll that `/telos` renders on desktop.
 * Cards are built from the shared registry, so this list and the desktop stack
 * are the same list — a section added to the registry shows up here with its
 * label and blurb and no edit in this file.
 */

import Link from "next/link";
import { ChevronRight, Target } from "lucide-react";
import { TELOS_SECTIONS } from "@/app/telos/_v7/section-registry";

export default function TelosIndex() {
  return (
    <div className="pm-telos-index">
      <header className="pm-telos-index-head">
        <Target className="w-5 h-5" />
        <div>
          <h1>TELOS</h1>
          <p>Twelve views of where you are and where you&rsquo;re going. One at a time.</p>
        </div>
      </header>

      <nav className="pm-telos-cards" aria-label="TELOS sections">
        {TELOS_SECTIONS.map((s) => (
          <Link key={s.slug} href={`/m/telos/${s.slug}`} className="pm-telos-card">
            <div className="pm-telos-card-body">
              <span className="pm-telos-card-label">{s.label}</span>
              <span className="pm-telos-card-blurb">{s.blurb}</span>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </Link>
        ))}
      </nav>
    </div>
  );
}

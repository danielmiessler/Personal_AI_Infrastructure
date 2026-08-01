"use client";

import { useState } from "react";
import type { Telos } from "./data";
import { Icons } from "./icons";

// Still loose — unassigned / orphans. Warm, forgiving.

interface StrandedProps {
  telos: Telos;
  showIds: boolean;
  openFile?: (name: string) => void;
}

interface StrRowProps {
  id: string;
  title: string;
  tail: { label: string; value: string };
  showIds: boolean;
  openFile?: (name: string) => void;
  file: string;
}

function StrRow({ id, title, tail, showIds, openFile, file }: StrRowProps) {
  const clickable = !!openFile;
  return (
    <div
      className="str-row"
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      style={clickable ? { cursor: "pointer" } : undefined}
      onClick={clickable ? () => openFile(file) : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openFile(file);
        }
      } : undefined}
    >
      {showIds && <span className="id mono">{id}</span>}
      <span className="t">{title}</span>
      <span className={tail.label}>{tail.value}</span>
    </div>
  );
}

export function Stranded({ telos, showIds, openFile }: StrandedProps) {
  const [open, setOpen] = useState(false);
  const n = telos.stranded.work_no_goal.length
          + telos.stranded.goals_no_strategy.length
          + telos.stranded.strategies_idle.length;
  // No backing parser yet (public issue #1532) — a "0 items drifting" toggle over
  // a permanently-null API field reads as broken, not empty. Hide until real.
  if (n === 0) return null;
  return (
    <section className={'stranded'+(open?' open':'')}>
      <button className="str-toggle" onClick={()=>setOpen(o=>!o)}>
        <span className="str-head-title">Unassigned</span>
        <span className="str-head-count">{n} items drifting without a home</span>
        <Icons.Chev size={14} style={{transform:open?'rotate(180deg)':'none',transition:'transform 200ms',marginLeft:'auto',color:'var(--text-3)'}}/>
      </button>
      {open && (
        <div className="str-body">
          <div className="str-col">
            <div className="str-head">Work without a Goal</div>
            {telos.stranded.work_no_goal.map(w=>(
              <StrRow key={w.id} id={w.id} title={w.title}
                tail={{ label: "age", value: `sitting ${w.age}` }}
                showIds={showIds} openFile={openFile} file="TELOS.md"/>
            ))}
          </div>
          <div className="str-col">
            <div className="str-head">Goals without a Strategy</div>
            {telos.stranded.goals_no_strategy.map(g=>(
              <StrRow key={g.id} id={g.id} title={g.title}
                tail={{ label: "reason", value: g.reason }}
                showIds={showIds} openFile={openFile} file="TELOS.md"/>
            ))}
          </div>
          <div className="str-col">
            <div className="str-head">Strategies with no Work pulling on them</div>
            {telos.stranded.strategies_idle.map(s=>(
              <StrRow key={s.id} id={s.id} title={s.title.split('—')[0].trim()}
                tail={{ label: "reason", value: s.reason }}
                showIds={showIds} openFile={openFile} file="TELOS.md"/>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

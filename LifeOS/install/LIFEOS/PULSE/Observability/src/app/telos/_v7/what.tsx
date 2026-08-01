"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Project, Telos, Work } from "./data";

// What — In motion. Dense Projects × Work table with status dots, strategy badges, ETAs.

type Status = Project["status"];

interface StatusDotProps {
  s: Status;
  title?: string;
}

interface WorkCellProps {
  w: Work;
  onHover: (strategy: string | null) => void;
  hoverStrat: string | null;
  showIds: boolean;
  onOpenItem?: (id: string) => void;
}

interface WhatProps {
  telos: Telos;
  showIds: boolean;
  onOpenItem?: (id: string) => void;
}

function StatusDot({ s, title }: StatusDotProps) {
  const cls = s==='green'?'dot-ok':s==='amber'?'dot-warn':'dot-bad';
  return <span className={'dot '+cls} title={title}/>;
}

function statusLabel(s: Status) { return s==='green'?'moving':s==='amber'?'needs a look':'stuck'; }

function WorkCell({ w, onHover, hoverStrat, showIds, onOpenItem }: WorkCellProps) {
  const dim = hoverStrat && hoverStrat !== w.strategy;
  return (
    <div className={'work'+(dim?' dim':'')}
         role={onOpenItem ? 'button' : undefined}
         tabIndex={onOpenItem ? 0 : undefined}
         style={onOpenItem ? { cursor: 'pointer' } : undefined}
         onClick={onOpenItem ? (e) => { e.stopPropagation(); onOpenItem(w.id); } : undefined}
         onKeyDown={onOpenItem ? (e) => {
           if (e.key === 'Enter' || e.key === ' ') {
             e.preventDefault();
             e.stopPropagation();
             onOpenItem(w.id);
           }
         } : undefined}
         onMouseEnter={()=>onHover(w.strategy)} onMouseLeave={()=>onHover(null)}>
      <div className="work-top">
        <StatusDot s={w.status} title={statusLabel(w.status)}/>
        <span className="work-title">{w.title}</span>
      </div>
      <div className="work-foot">
        <span className="work-eta">{w.eta}</span>
        <span className="strat-badge">{showIds ? w.strategy : '↳'}</span>
        <span className="work-owner">{w.owner}</span>
      </div>
    </div>
  );
}

export function What({ telos, showIds, onOpenItem }: WhatProps) {
  const [hoverStrat, setHoverStrat] = useState<string | null>(null);
  const totals = {
    green: telos.projects.filter(p=>p.status==='green').length,
    amber: telos.projects.filter(p=>p.status==='amber').length,
    red:   telos.projects.filter(p=>p.status==='red').length,
  };
  return (
    <section className="what" id="sec-projects">
      <header className="band-head">
        <div>
          <h2 className="band-title">Projects and Work</h2>
          <p className="band-sub">What&rsquo;s moving right now. Each work item traces back to the strategy it serves.</p>
        </div>
        <div className="what-legend">
          <span><StatusDot s="green"/> {totals.green} moving</span>
          <span><StatusDot s="amber"/> {totals.amber} need a look</span>
          <span><StatusDot s="red"/> {totals.red} stuck</span>
        </div>
      </header>

      {telos.projects.length === 0 && (
        <p className="muted">Nothing in flight — the work registry and app monitor feed this table.</p>
      )}
      <div className="what-grid">
        <div className="what-head">
          <div>Project</div>
          <div>Strategy</div>
          <div>Feeds</div>
          <div>Work in flight</div>
        </div>
        {telos.projects.map(p=>(
          <div
            key={p.id}
            className="what-row"
            role={onOpenItem ? 'button' : undefined}
            tabIndex={onOpenItem ? 0 : undefined}
            style={onOpenItem ? { cursor: 'pointer' } : undefined}
            onClick={onOpenItem ? () => onOpenItem(p.id) : undefined}
            onKeyDown={onOpenItem ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenItem(p.id);
              }
            } : undefined}
          >
            <div className="p-cell">
              <StatusDot s={p.status} title={statusLabel(p.status)}/>
              <div className="p-title-wrap">
                <div className="p-title">{p.title}</div>
                <div className="p-meta">
                  {statusLabel(p.status)}
                  {showIds && <><span className="p-meta-sep">·</span><span className="mono p-id">{p.id}</span></>}
                </div>
              </div>
            </div>
            <div className="p-strat">
              <span className="strat-badge big">{p.strategy}</span>
            </div>
            <div className="p-dims">
              {p.dims.map((d,i)=>(
                <span key={d} className="dim-tag" style={{'--c':`var(--${d})`} as CSSProperties}>{d}</span>
              ))}
            </div>
            <div className="p-work">
              {p.work.map(w=>(
                <WorkCell key={w.id} w={w} onHover={setHoverStrat} hoverStrat={hoverStrat} showIds={showIds} onOpenItem={onOpenItem}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

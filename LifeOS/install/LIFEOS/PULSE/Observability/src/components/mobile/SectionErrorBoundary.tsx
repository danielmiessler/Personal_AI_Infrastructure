"use client";

/**
 * A section that throws must not blank the whole page.
 *
 * On desktop a bad section is one band in a twelve-band scroll; on mobile it
 * IS the page, so an unhandled throw leaves the visitor staring at Next's
 * generic "a client-side exception has occurred". This boundary keeps the
 * shell, names the section, and shows the actual message — which is also how
 * the failure gets diagnosed at all, since production React logs nothing
 * useful to the page.
 */

import { Component, type ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

interface State {
  message: string | null;
  stack: string | null;
}

export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { message: null, stack: null };

  static getDerivedStateFromError(err: unknown): State {
    return {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? (err.stack ?? null) : null,
    };
  }

  render() {
    if (this.state.message === null) return this.props.children;
    return (
      <div className="pm-section-error">
        <strong>{this.props.label} failed to render.</strong>
        <p>{this.state.message}</p>
        {this.state.stack && <pre>{this.state.stack.split("\n").slice(0, 6).join("\n")}</pre>}
      </div>
    );
  }
}

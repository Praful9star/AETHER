"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Raw error detail stays in the console for debugging — never shown
    // to the visitor, who should just see the cosmos gently step aside.
    console.error("AETHER caught a render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050308] gap-4 px-6"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
          <p className="text-white/30 text-sm italic text-center max-w-xs">
            The cosmos is resting. It will return in a moment.
          </p>
          <button onClick={() => window.location.reload()}
            className="text-white/40 hover:text-white/70 transition-colors text-[11px] tracking-[0.3em] border border-white/15 hover:border-white/30 rounded-full px-6 py-2.5"
            style={{ fontFamily: "var(--font-sans), Arial, sans-serif" }}>
            RETURN
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

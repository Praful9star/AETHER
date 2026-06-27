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

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050308] gap-3 px-6">
          <p className="text-white/20 text-xs tracking-widest">THE COSMOS IS RESTING</p>
          <p className="text-red-400/60 text-xs text-center max-w-xs break-words">
            {this.state.error?.message ?? "Unknown error"}
          </p>
          <p className="text-white/10 text-xs text-center max-w-xs break-words font-mono">
            {this.state.error?.stack?.split("\n")[1]?.trim() ?? ""}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

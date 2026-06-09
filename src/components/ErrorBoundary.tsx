import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div id="error-boundary-container" className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div id="error-boundary-card" className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
            <div id="error-icon-wrapper" className="inline-flex items-center justify-center size-16 rounded-full bg-rose-50 text-rose-500 border border-rose-100">
              <AlertOctagon size={32} />
            </div>
            
            <div id="error-text-container" className="space-y-2">
              <h1 id="error-title" className="text-2xl font-bold text-slate-800 tracking-tight">સિસ્ટમમાં ખામી આવી છે</h1>
              <p id="error-desc" className="text-slate-500 text-sm">એપ્લીકેશન શરૂ કરવામાં અથવા ડેટા મેળવવામાં કોઈ અણધારી સમસ્યા નડી છે.</p>
            </div>

            {this.state.error && (
              <div id="error-details-container" className="text-left bg-slate-900 text-slate-300 rounded-lg p-4 font-mono text-xs overflow-auto max-h-40 leading-relaxed scrollbar-thin">
                <p id="error-msg-tag" className="font-semibold text-rose-400">Error: {this.state.error.name}</p>
                <p id="error-msg-body" className="mt-1">{this.state.error.message}</p>
              </div>
            )}

            <button
              id="error-reset-button"
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/95 font-medium rounded-xl transition duration-200 shadow-md shadow-primary/10 cursor-pointer active:scale-[0.98]"
            >
              <RefreshCw size={16} />
              ફરીથી પ્રયાસ કરો (Retry)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

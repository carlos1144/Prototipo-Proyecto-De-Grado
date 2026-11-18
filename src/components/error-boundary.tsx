import * as React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ha ocurrido un error inesperado en la aplicación.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary capturó un error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; operationType?: string };
        if (parsed.error) {
          friendlyMessage = `Error de acceso a datos (${parsed.operationType || 'operación'}): ${parsed.error}`;
        }
      } catch {
        // Not JSON, keep original message
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  No se pudo completar la operación
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{friendlyMessage}</p>
                <div className="mt-5">
                  <Button
                    type="button"
                    onClick={() => {
                      this.setState({ hasError: false, message: '' });
                      window.location.href = '/';
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Volver al inicio
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

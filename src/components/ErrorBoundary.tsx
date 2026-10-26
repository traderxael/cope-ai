import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Logo } from './Logo';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    console.error(`[cope] render_error:${error.name}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatalError">
          <Logo withWordmark size={48} />
          <h1>Algo se rompió en la interfaz.</h1>
          <p>
            Recargá la página para volver a intentar. Tu historial local no se
            borra.
          </p>
          <button
            type="button"
            className="button primary"
            onClick={() => window.location.reload()}
          >
            Recargar Cope AI
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

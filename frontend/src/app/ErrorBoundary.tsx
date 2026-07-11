import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card } from "../design-system/components/Card";
import { Button } from "../design-system/components/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches render-time errors anywhere in the tree; React has no hook equivalent yet. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  private readonly reset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error) {
      return (
        <Card>
          <h1>Algo salio mal</h1>
          <p>Ocurrio un error inesperado en la interfaz. Podes intentar de nuevo.</p>
          <Button onClick={this.reset}>Reintentar</Button>
        </Card>
      );
    }
    return this.props.children;
  }
}

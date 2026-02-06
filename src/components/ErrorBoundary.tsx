import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    this.setState({ hasError: false, error: null });
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred. Please try refreshing the page or go back.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded max-w-full overflow-auto">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={this.handleGoBack}>
                Go Back
              </Button>
              <Button onClick={this.handleReload}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

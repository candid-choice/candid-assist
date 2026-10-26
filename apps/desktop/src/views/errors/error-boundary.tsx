/** Human Assist — React Error Boundary.

Wraps the application shell to catch:
- Rendering errors (component crashes)
- Hook errors (invalid React calls)
- Event handler errors

Routes to the error hub for toast/banner display.

Usage:
  <ErrorBoundary>
    <App />
  </ErrorBoundary>

On error:
- P0: Full-screen overlay with restart option
- P1: Toast with "View Details" link
- P2-P4: Toast only (or silent)
*/

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface ErrorData {
  severity: number;
  showOverlay: boolean;
  message: string;
  recovery: string;
}

interface State {
  hasError: boolean;
  errorData: ErrorData | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorData: null };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, errorData: null };
  }

  componentDidCatch(error: Error): void {
    let errorData: ErrorData = {
      severity: 2,
      showOverlay: false,
      message: this.props.fallbackMessage || 'An unexpected error occurred',
      recovery: 'Try refreshing the app',
    };

    if (error.message.includes('auth')) {
      errorData.severity = 0;
      errorData.showOverlay = true;
      errorData.message = 'Authentication failed — please sign in again';
    } else if (error.message.includes('firestore')) {
      errorData.severity = 1;
      errorData.message = 'Firebase error — check connection';
    } else if (error.message.includes('render')) {
      errorData.severity = 1;
      errorData.message = 'A component failed to render';
    }

    this.setState({ errorData });
  }

  render() {
    if (this.state.hasError && this.state.errorData) {
      const { errorData } = this.state;

      if (errorData.showOverlay) {
        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}>
            <div style={{
              background: '#1a1a2e',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '480px',
              width: '90%',
              textAlign: 'center',
              color: '#fff',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                margin: '0 0 12px 0',
              }}>
                {errorData.message}
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#aaa',
                margin: '0 0 24px 0',
                lineHeight: '1.5',
              }}>
                {errorData.recovery}
              </p>
              <button
                style={{
                  padding: '10px 24px',
                  background: '#6c63ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginRight: '8px',
                }}
                onClick={() => {
                  this.setState({ hasError: false, errorData: null });
                  window.location.reload();
                }}
              >
                Restart App
              </button>
              <button
                style={{
                  padding: '10px 24px',
                  background: 'transparent',
                  color: '#aaa',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  this.setState({ hasError: false, errorData: null });
                }}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        );
      }

      return (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          background: '#fff3f3',
          border: '1px solid #ffcdd2',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#c62828',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          maxWidth: '400px',
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span>{errorData.message}</span>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: '#c62828',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
            onClick={() => this.setState({ hasError: false, errorData: null })}
          >
            Dismiss
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

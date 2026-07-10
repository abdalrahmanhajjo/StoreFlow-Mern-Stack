import { Component, type ReactNode } from 'react';
import { ServerCrash } from './ErrorIllustrations';

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('Render error:', error);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    return <Error500 message={this.state.message} onReset={this.reset} />;
  }
}

export function Error500({ message, onReset }: { message?: string; onReset?: () => void }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center', padding: 24, background: 'var(--paper)' }}>
      <div style={{ maxWidth: 400 }}>
        <ServerCrash />
        <div className="display" style={{ fontSize: 56, fontWeight: 800, color: 'var(--blue)', marginTop: 8 }}>500</div>
        <h1 className="display" style={{ color: 'var(--ink)', margin: '4px 0 8px', fontSize: 22 }}>Something went wrong</h1>
        <p style={{ color: 'var(--ink-soft)', margin: '0 0 20px', fontSize: 14, lineHeight: 1.5 }}>An unexpected error occurred. Our team has been notified.</p>
        {message && (
          <div style={{ background: 'var(--paper-dim)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', marginBottom: 20, fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left', maxHeight: 80, overflow: 'auto' }}>
            {message}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {onReset && (
            <button type="button" onClick={onReset} style={{ background: 'var(--ink)', color: 'var(--card)', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Try again
            </button>
          )}
          <a href="/dashboard" style={{ background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

// SF-1501: catch render errors so a screen crash never blanks the whole app.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    // In production this would report to an error tracker (Sentry/Datadog).
    console.error('Render error:', error);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', textAlign: 'center', padding: 24 }}>
        <div>
          <div className="display" style={{ fontSize: 56, fontWeight: 800, color: 'var(--blue)' }}>500</div>
          <h1 className="display" style={{ color: 'var(--ink)', margin: '4px 0 8px' }}>Something went wrong</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>An unexpected error occurred on this screen.</p>
          <button type="button" onClick={this.reset} style={{ background: 'linear-gradient(180deg,#3B82F6,#2563EB)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Try again</button>
        </div>
      </div>
    );
  }
}

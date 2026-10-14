import { Component, type ErrorInfo, type ReactNode } from 'react';
import { exportBackup } from '../lib/backup';

interface State {
  error: Error | null;
  saved: boolean;
}

/** If something crashes, show a calm fallback instead of a blank page — and a way to save everything first. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, saved: false };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Stillpoint crashed:', error, info.componentStack);
  }

  render() {
    const { error, saved } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash">
        <div className="crash-card">
          <div className="eyebrow">Stillpoint</div>
          <h2>Something went wrong</h2>
          <p>Your notes and progress are still saved in this browser. Reloading usually fixes it.</p>
          <div className="row wrap">
            <button className="btn primary" onClick={() => location.reload()}>
              Reload
            </button>
            <button
              className="btn"
              onClick={() =>
                void exportBackup()
                  .then(() => this.setState({ saved: true }))
                  .catch(() => {})
              }
            >
              {saved ? 'Backup saved ✓' : 'Download a backup'}
            </button>
          </div>
          <details>
            <summary className="muted small">Error details (screenshot this if you report it)</summary>
            <pre className="small">{String(error.stack || error.message).slice(0, 1200)}</pre>
          </details>
        </div>
      </div>
    );
  }
}

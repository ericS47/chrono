import { Component, type ReactNode } from 'react';

/** Affiche l'erreur au lieu d'une page blanche, avec un bouton pour repartir. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="screen no-nav">
        <h1 className="page-title">Oups</h1>
        <p>Chrono a rencontré une erreur. Tes données sont intactes.</p>
        <pre className="code-box" style={{ whiteSpace: 'pre-wrap' }}>{`${error.name}: ${error.message}\n${(error.stack ?? '').split('\n').slice(0, 6).join('\n')}\n${navigator.userAgent}`}</pre>
        <button className="btn" onClick={() => { window.location.hash = '#/'; this.setState({ error: null }); }}>Revenir à l’accueil</button>
      </main>
    );
  }
}

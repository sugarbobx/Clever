import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <p className="text-5xl mb-4">⚠️</p>
            <h2 className="text-xl font-semibold text-[#1A3C34] mb-2">Quelque chose s'est mal passé</h2>
            <p className="text-sm text-gray-500 mb-6">Une erreur inattendue s'est produite sur cette page.</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-[#1A3C34] text-white rounded-md px-6 py-2.5 text-sm font-medium hover:bg-[#122B25] transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import React from 'react';

/**
 * Lightweight error boundary for individual sections.
 * If a section crashes, it silently hides instead of taking down the whole page.
 */
export class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn(`[SectionErrorBoundary] ${this.props.name || 'Section'} error:`, error.message);
  }

  render() {
    if (this.state.hasError) {
      // Silently hide the broken section
      return null;
    }
    return this.props.children;
  }
}

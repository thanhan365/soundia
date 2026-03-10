import React from 'react';
import { HiRefresh, HiHome } from 'react-icons/hi';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => { window.location.reload(); };
  handleGoHome = () => { window.location.href = '/'; };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#170f23] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="mb-6 text-6xl">💥</div>

            <h1 className="text-2xl font-bold text-white mb-3">
              Ôi, có lỗi xảy ra!
            </h1>
            <p className="text-gray-400 mb-6 text-sm">
              Ứng dụng gặp sự cố không mong muốn. Hãy thử tải lại trang hoặc quay về trang chủ.
            </p>

            {/* Error Details (collapsible) */}
            {this.state.error && (
              <details className="mb-6 text-left bg-white/5 rounded-xl p-4 border border-white/10">
                <summary className="text-gray-300 cursor-pointer text-sm font-medium">
                  Chi tiết lỗi
                </summary>
                <pre className="mt-3 text-xs text-red-400 whitespace-pre-wrap overflow-x-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-full transition-all duration-300 text-sm"
              >
                <HiRefresh className="text-lg" />
                Tải lại
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full transition-all duration-300 border border-white/10 text-sm"
              >
                <HiHome className="text-lg" />
                Trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import React from 'react';

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown rendering error',
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App render error captured by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-zinc-200 rounded-sm shadow-sm p-6 space-y-4">
            <div className="text-xs font-black tracking-widest uppercase text-zinc-400">System Recovery</div>
            <h1 className="text-lg font-black text-zinc-950">發生錯誤，已啟用保護模式</h1>
            <p className="text-sm text-zinc-600">
              App 遇到非預期錯誤。請重新整理後重試，系統會保留最近操作頁面。
            </p>
            <div className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-sm p-3 break-words">
              {this.state.errorMessage}
            </div>
            <button
              onClick={this.handleReload}
              className="w-full bg-zinc-950 text-white py-3 text-xs font-black tracking-widest uppercase rounded-sm"
            >
              重新載入 / Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

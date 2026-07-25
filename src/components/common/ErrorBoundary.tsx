import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6 text-slate-800 dark:text-slate-100 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Đã xảy ra sự cố hiển thị
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ứng dụng vừa gặp lỗi không mong muốn. Bạn có thể tải lại trang hoặc khôi phục dữ liệu mặc định.
            </p>
            {this.state.error && (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 text-left overflow-auto max-h-32 text-[11px] font-mono text-red-600 dark:text-red-400">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Tải Lại Trứng Ứng Dụng</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component, ErrorInfo, PropsWithChildren } from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.hash = ''
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">工具发生了错误</h2>
          <p className="text-gray-600 mb-1 max-w-md">
            当前工具遇到了未预期的问题。这不会影响其他工具的使用。
          </p>
          <p className="text-xs text-gray-400 mb-6 font-mono max-w-lg break-all">
            {this.state.error?.message}
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-3 border-2 border-gray-900 bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors"
            style={{ borderRadius: '2px' }}
          >
            返回首页
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

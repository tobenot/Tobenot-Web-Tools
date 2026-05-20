import { createContext, useCallback, useContext, useState, PropsWithChildren } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed top-16 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className="pointer-events-auto animate-slideIn"
              onClick={() => dismiss(t.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`flex items-center gap-2 px-4 py-3 border-2 shadow-lg font-medium text-sm ${typeStyles[t.type]}`}
                style={{ borderRadius: '2px', minWidth: '200px', maxWidth: '360px' }}
              >
                <span>{typeIcons[t.type]}</span>
                <span className="flex-1">{t.message}</span>
                <span className="text-xs opacity-50 ml-2">✕</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideIn { animation: toastSlideIn 0.3s ease-out; }
      `}</style>
    </ToastContext.Provider>
  )
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-white border-green-400 text-green-800',
  error: 'bg-white border-red-400 text-red-800',
  info: 'bg-white border-blue-400 text-blue-800',
}

const typeIcons: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
}

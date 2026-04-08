import { useEffect } from 'react'
import type { Toast as ToastType } from '../../hooks/useToast'

interface ToastProps {
  toast: ToastType
  onRemove: (id: string) => void
}

const typeStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-brand-lavender border-brand-violet/30 text-brand-deep',
}

const typeIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3800)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
        font-body text-sm animate-slide-up
        ${typeStyles[toast.type]}
      `}
    >
      <span className="font-bold">{typeIcons[toast.type]}</span>
      <span>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastType[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

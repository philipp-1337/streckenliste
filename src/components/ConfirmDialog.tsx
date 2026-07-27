import { useEffect, useId, useRef, useState } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onCancel,
  onConfirm,
}) => {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const confirmingRef = useRef(false)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirmingRef.current) {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [onCancel, open])

  if (!open) return null

  const handleConfirm = async () => {
    confirmingRef.current = true
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      confirmingRef.current = false
      setIsConfirming(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isConfirming) onCancel()
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <div id={descriptionId} className="mt-2 space-y-2 text-sm text-gray-600">
          {description}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="min-h-11 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isConfirming}
            className={`min-h-11 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              tone === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-700'
                : 'bg-green-700 hover:bg-green-800 focus-visible:ring-green-700'
            }`}
          >
            {isConfirming ? 'Wird ausgeführt…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

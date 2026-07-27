import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

interface DialogShellProps {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
  closeDisabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  initialFocusRef?: React.RefObject<HTMLElement | null>
}

export const DialogShell: React.FC<DialogShellProps> = ({
  title,
  description,
  children,
  footer,
  onClose,
  closeDisabled = false,
  size = 'md',
  initialFocusRef,
}) => {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closeDisabledRef = useRef(closeDisabled)

  useEffect(() => {
    closeDisabledRef.current = closeDisabled
  }, [closeDisabled])

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ;(initialFocusRef?.current || closeRef.current)?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabledRef.current) {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ))
      if (!focusable.length) return
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
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [initialFocusRef, onClose])

  const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-4xl' : 'max-w-lg'

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !closeDisabled) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`flex max-h-[90dvh] w-full ${width} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm text-gray-600">{description}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Dialog schließen"
          >
            <X size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && <footer className="border-t border-gray-100 px-5 py-4 sm:px-6">{footer}</footer>}
      </div>
    </div>
  )
}

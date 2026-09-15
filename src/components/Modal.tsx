import { useEffect, useId, type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'small' | 'large'
}

export function Modal({ title, onClose, children, size = 'large' }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

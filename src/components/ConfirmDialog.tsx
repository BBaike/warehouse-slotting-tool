interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <p>{message}</p>
        <div className="dialog-actions">
          <button type="button" className="danger" onClick={onConfirm}>
            Удалить
          </button>
          <button type="button" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

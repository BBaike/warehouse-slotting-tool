import { Modal } from './Modal'

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal title="Удаление" size="small" onClose={onCancel}>
      <p className="modal-text">{message}</p>
      <div className="modal-actions">
        <button type="button" className="button" onClick={onCancel}>
          Отмена
        </button>
        <button type="button" className="button button-danger" onClick={onConfirm} autoFocus>
          Удалить
        </button>
      </div>
    </Modal>
  )
}

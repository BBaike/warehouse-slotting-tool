interface EmptyStateProps {
  title: string
  text: string
  action?: string
  onAction?: () => void
}

export function EmptyState({ title, text, action, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-mark" aria-hidden="true" />
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      {action && onAction && (
        <button type="button" className="button button-primary" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  /** Unit shown inside the input's right edge, e.g. `см`. */
  suffix?: string
  children: ReactNode
}

export function FormField({ label, htmlFor, error, suffix, children }: FormFieldProps) {
  return (
    <div className={error ? 'form-field form-field-invalid' : 'form-field'}>
      <label htmlFor={htmlFor}>{label}</label>
      {suffix ? (
        <div className="input-with-suffix">
          {children}
          <span className="input-suffix" aria-hidden="true">
            {suffix}
          </span>
        </div>
      ) : (
        children
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

import React from 'react'

export interface UploaderProps {
  /** Headline. */
  title?: string
  /** Supporting line. */
  hint?: string
  /** Called when files are dropped or chosen. */
  onFiles?: (files: FileList) => void
  /** Accepted file types (passed to the input). */
  accept?: string
  className?: string
}

/**
 * A drag-and-drop upload zone — the desktop fallback for adding a bottle by
 * photo, or dropping a list to import.
 */
export function Uploader({
  title = 'Drop a photo here',
  hint = 'or click to browse — JPG, PNG, HEIC',
  onFiles,
  accept = 'image/*',
  className,
}: UploaderProps) {
  const cls = ['ws-uploader', className].filter(Boolean).join(' ')
  const inputRef = React.useRef<HTMLInputElement>(null)
  return (
    <button type="button" className={cls} onClick={() => inputRef.current?.click()}>
      <span className="ws-uploader__icon" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 16V4m0 0L7 9m5-5 5 5" />
          <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
        </svg>
      </span>
      <span className="ws-uploader__title">{title}</span>
      <span className="ws-uploader__hint">{hint}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        multiple
        onChange={(e) => e.target.files && onFiles?.(e.target.files)}
      />
    </button>
  )
}

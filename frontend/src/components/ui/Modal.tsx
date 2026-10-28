import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    dialog.showModal()
    return () => { dialog.close(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose() }} onKeyDown={e => {
    if (e.key !== 'Tab') return
    const focusable = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(node => node.getClientRects().length > 0)
    const first = focusable[0]
    const last = focusable.at(-1)
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
  }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="modal-content">
      <div className="modal-header"><div><span className="eyebrow">AGENTGAIN · FRONTEND PREVIEW</span><h2 id={titleId}>{title}</h2></div>
        <button autoFocus className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={22} /></button>
      </div>
      {children}
    </div>
  </dialog>
}

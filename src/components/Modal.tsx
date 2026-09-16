import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

// Feuille modale simple, en bas d'écran sur mobile (plus pratique à
// atteindre d'un pouce que centrée).
export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-4 max-h-[90dvh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-neutral-800">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-neutral-400 hover:text-neutral-600 text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

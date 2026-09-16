import { useState, type FormEvent } from 'react'

const services = [
  { label: 'Pose gel', duration: 90 },
  { label: 'Remplissage', duration: 60 },
  { label: 'Semi-permanent', duration: 45 },
  { label: 'Dépose', duration: 30 },
  { label: 'Nail art', duration: 60 },
  { label: 'Autre', duration: 60 },
]

export interface AppointmentInput {
  title: string
  start: Date
  durationMin: number
  notes?: string
}

interface AppointmentFormProps {
  saving: boolean
  onSubmit: (input: AppointmentInput) => void
  onCancel: () => void
}

function todayISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

const inputClass =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400'

export default function AppointmentForm({ saving, onSubmit, onCancel }: AppointmentFormProps) {
  const [title, setTitle] = useState(services[0].label)
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('10:00')
  const [durationMin, setDurationMin] = useState(services[0].duration)
  const [notes, setNotes] = useState('')

  function handleServiceChange(label: string) {
    setTitle(label)
    const service = services.find((s) => s.label === label)
    if (service) setDurationMin(service.duration)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // "2026-09-20T10:00" sans fuseau = heure locale de l'appareil
    const start = new Date(`${date}T${time}`)
    onSubmit({ title, start, durationMin, notes: notes.trim() || undefined })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Prestation</label>
        <select value={title} onChange={(e) => handleServiceChange(e.target.value)} className={inputClass}>
          {services.map((s) => (
            <option key={s.label}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Date</label>
          <input type="date" required min={todayISO()} value={date}
            onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Heure</label>
          <input type="time" required step={900} value={time}
            onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Durée</label>
        <select value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className={inputClass}>
          {[30, 45, 75, 90, 105, 120, 135, 150, 165].map((m) => (
            <option key={m} value={m}>
              {m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="Couleur, forme, remarque…" className={inputClass} />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 font-medium text-neutral-600">
          Annuler
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 rounded-lg bg-rose-600 py-2.5 font-medium text-white disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Créer le RDV'}
        </button>
      </div>
    </form>
  )
}

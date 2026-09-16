import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import type { Client } from '../../types'

export type ServiceOption = {
  label: string
  duration: number
  color: string
}

export const services: ServiceOption[] = [
  { label: 'Manucure russe', duration: 30, color: '#CFE8FF' },
  { label: 'Renfort', duration: 90, color: '#F9DCE8' },
  { label: 'Gainage', duration: 105, color: '#D9F0D3' },
  { label: 'Semi pieds', duration: 45, color: '#F9C98D' },
  { label: 'Rallongement', duration: 120, color: '#E5D5FF' },
  { label: 'Semi mains + pieds', duration: 135, color: '#E9A8C8' },
  { label: 'Gainage mains + pieds', duration: 150, color: '#8CCF8F' },
  { label: 'Rallongement mains + pieds', duration: 165, color: '#B69AEF' },
  { label: 'Dépose', duration: 45, color: '#CFE8FF' },
]

export interface AppointmentInput {
  title: string
  start: Date
  durationMin: number
  notes?: string
  clientId?: string
  clientName?: string
  clientPhone?: string
}

interface AppointmentFormProps {
  saving: boolean
  onSubmit: (input: AppointmentInput) => void
  onCancel: () => void
  initial?: Partial<AppointmentInput>
  submitLabel?: string
  clients?: Pick<Client, 'id' | 'firstName' | 'lastName' | 'phone'>[]
  onCreateClient?: () => void
  hideClientSelector?: boolean
}

function todayISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

function toDateInputValue(date: Date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

function toTimeInputValue(date: Date) {
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const inputClass =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]'

export default function AppointmentForm({
  saving,
  onSubmit,
  onCancel,
  initial,
  submitLabel = 'Créer le RDV',
  clients = [],
  onCreateClient,
  hideClientSelector = false,
}: AppointmentFormProps) {
  const [title, setTitle] = useState(initial?.title ?? services[0].label)
  const [date, setDate] = useState(initial?.start ? toDateInputValue(initial.start) : todayISO())
  const [time, setTime] = useState(initial?.start ? toTimeInputValue(initial.start) : '10:00')
  const [durationMin, setDurationMin] = useState(initial?.durationMin ?? services[0].duration)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [clientId, setClientId] = useState(initial?.clientId ?? clients[0]?.id ?? '')
  const [clientQuery, setClientQuery] = useState('')

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((client) => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase()
      const phone = (client.phone ?? '').toLowerCase()
      return fullName.includes(q) || phone.includes(q)
    })
  }, [clientQuery, clients])

  useEffect(() => {
    if (!initial) return
    setTitle(initial.title ?? services[0].label)
    setDate(initial.start ? toDateInputValue(initial.start) : todayISO())
    setTime(initial.start ? toTimeInputValue(initial.start) : '10:00')
    setDurationMin(initial.durationMin ?? services[0].duration)
    setNotes(initial.notes ?? '')
    setClientId(initial.clientId ?? clients[0]?.id ?? '')
  }, [initial, clients])

  useEffect(() => {
    if (hideClientSelector) {
      if (!initial?.clientId && clients[0]) {
        setClientId(clients[0].id)
      }
      return
    }
    if (!clients.length) {
      setClientId('')
      return
    }
    const validClient = clients.some((client) => client.id === clientId)
    if (!validClient) {
      setClientId(clients[0].id)
    }
  }, [clients, clientId, hideClientSelector, initial?.clientId])

  function handleServiceChange(label: string) {
    setTitle(label)
    const service = services.find((s) => s.label === label)
    if (service) setDurationMin(service.duration)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!clientId) return

    const selectedClient = clients.find((client) => client.id === clientId)
    if (!selectedClient) return

    // "2026-09-20T10:00" sans fuseau = heure locale de l'appareil
    const start = new Date(`${date}T${time}`)
    onSubmit({
      title,
      start,
      durationMin,
      notes: notes.trim() || undefined,
      clientId: selectedClient.id,
      clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
      clientPhone: selectedClient.phone,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Client</label>
        <div className="flex gap-2">
          {clients.length === 0 ? (
            <div className="flex-1 rounded-lg border border-dashed border-[#d7bda3] bg-[#f5eee7] px-3 py-2 text-sm text-neutral-500">
              Aucune cliente disponible — crée d’abord une fiche cliente.
            </div>
          ) : (
            <div className="flex-1 space-y-2">
              {!hideClientSelector && (
                <input
                  type="text"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Rechercher une cliente…"
                  className={`${inputClass} bg-white`}
                />
              )}
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={hideClientSelector}
                className={`${inputClass} ${hideClientSelector ? 'cursor-not-allowed bg-neutral-100 text-neutral-500 opacity-80' : ''} ${onCreateClient && !hideClientSelector ? 'pr-10' : ''}`}
                required
              >
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </option>
                  ))
                ) : (
                  <option value="">Aucune cliente trouvée</option>
                )}
              </select>
            </div>
          )}
          {onCreateClient && !hideClientSelector && (
            <button
              type="button"
              onClick={onCreateClient}
              aria-label="Créer une cliente"
              className="shrink-0 h-[42px] w-[42px] rounded-lg border border-neutral-300 bg-white text-neutral-700 transition hover:bg-[#f5eee7]"
            >
              <FontAwesomeIcon icon={faPlus} className="text-sm" />
            </button>
          )}
        </div>
      </div>
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
        <button
          type="submit"
          disabled={saving || clients.length === 0 || !clientId}
          className="flex-1 rounded-lg bg-[#8a6448] py-2.5 font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

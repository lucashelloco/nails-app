import { useCallback, useEffect, useState } from 'react'
import type { Client } from '../types'
import {
  createAppointment,
  ensureToken,
  formatEventStart,
  getUpcomingEvents,
  GoogleAuthError,
  type CalendarEvent,
} from '../lib/googleCalendar'
import { useGoogleConnection } from '../lib/useGoogleConnection'
import Modal from './Modal'
import AppointmentForm, { type AppointmentInput } from './forms/AppointmentForm'

export default function ClientAppointments({ client }: { client: Client }) {
  const connected = useGoogleConnection()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setEvents(await getUpcomingEvents({ clientId: client.id, max: 5 }))
    } catch (e) {
      console.error(e)
    }
  }, [client.id])

  useEffect(() => {
    if (connected) load()
  }, [connected, load])

  function openForm() {
    setError(null)
    if (connected) {
      setFormOpen(true)
      return
    }
    // Connexion d'abord (dans le clic, pour éviter le blocage de popup)
    ensureToken()
      .then(() => setFormOpen(true))
      .catch(() => setError('Connexion Google annulée.'))
  }

  async function handleSubmit(input: AppointmentInput) {
    setSaving(true)
    setError(null)
    try {
      await createAppointment({
        ...input,
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
      })
      setFormOpen(false)
      await load()
    } catch (e) {
      console.error(e)
      setFormOpen(false)
      setError(
        e instanceof GoogleAuthError
          ? 'Session Google expirée : reconnecte-toi puis recommence.'
          : 'Le rendez-vous n’a pas pu être créé.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg bg-rose-50 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-rose-700">
          Rendez-vous
        </span>
        <button onClick={openForm} className="text-sm font-medium text-rose-600">
          + Prendre RDV
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {connected && events.length === 0 && (
        <p className="text-sm text-neutral-500">Aucun RDV à venir.</p>
      )}
      {events.length > 0 && (
        <ul className="space-y-1">
          {events.map((ev) => (
            <li key={ev.id} className="flex justify-between gap-2 text-sm">
              <span className="text-neutral-700">{ev.summary?.split(' — ')[0]}</span>
              <span className="text-neutral-500 tabular-nums">{formatEventStart(ev)}</span>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <Modal
          title={`RDV — ${client.firstName} ${client.lastName}`}
          onClose={() => setFormOpen(false)}
        >
          <AppointmentForm saving={saving} onSubmit={handleSubmit} onCancel={() => setFormOpen(false)} />
        </Modal>
      )}
    </div>
  )
}

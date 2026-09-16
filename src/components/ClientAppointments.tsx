import { useCallback, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import type { Client } from '../types'
import {
  createAppointment,
  cleanAppointmentNotes,
  deleteAppointment,
  ensureToken,
  formatEventStart,
  getUpcomingEvents,
  GoogleAuthError,
  type CalendarEvent,
  updateAppointment,
} from '../lib/googleCalendar'
import { useGoogleConnection } from '../lib/useGoogleConnection'
import Modal from './Modal'
import AppointmentForm, { services, type AppointmentInput } from './forms/AppointmentForm'

function trimEventSummary(summary?: string) {
  const raw = (summary ?? '').trim()
  if (!raw) return ''
  if (raw.includes(' — ')) return raw.split(' — ')[0].trim()
  return raw
}

export default function ClientAppointments({ client }: { client: Client }) {
  const connected = useGoogleConnection()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)

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

  function closeForm() {
    setFormOpen(false)
    setEditingEvent(null)
    setError(null)
  }

  function closeDeleteConfirm() {
    setDeleteTarget(null)
    setError(null)
  }

  function openForm() {
    setError(null)
    setEditingEvent(null)
    if (connected) {
      setFormOpen(true)
      return
    }
    // Connexion d'abord (dans le clic, pour éviter le blocage de popup)
    ensureToken()
      .then(() => setFormOpen(true))
      .catch(() => setError('Connexion Google annulée.'))
  }

  function openEditForm(ev: CalendarEvent) {
    const start = ev.start.dateTime ? new Date(ev.start.dateTime) : new Date(`${ev.start.date}T09:00`)
    const end = ev.end.dateTime ? new Date(ev.end.dateTime) : new Date(start.getTime() + 60 * 60 * 1000)
    const durationMin = Math.max(30, Math.round((end.getTime() - start.getTime()) / 60_000))
    const title = trimEventSummary(ev.summary) || services[0].label
    const notes = cleanAppointmentNotes(ev.description)
    setEditingEvent(ev)
    setFormOpen(true)
    setError(null)
    return { title, start, durationMin, notes }
  }

  async function handleSubmit(input: AppointmentInput) {
    setSaving(true)
    setError(null)
    try {
      if (editingEvent) {
        await updateAppointment(editingEvent.id, {
          ...input,
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
        })
      } else {
        await createAppointment({
          ...input,
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
        })
      }
      closeForm()
      await load()
    } catch (e) {
      console.error(e)
      setFormOpen(false)
      setError(
        e instanceof GoogleAuthError
          ? 'Session Google expirée : reconnecte-toi puis recommence.'
          : editingEvent
            ? 'Le rendez-vous n’a pas pu être modifié.'
            : 'Le rendez-vous n’a pas pu être créé.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(ev: CalendarEvent) {
    setError(null)
    try {
      await deleteAppointment(ev.id)
      setDeleteTarget(null)
      await load()
    } catch (e) {
      console.error(e)
      setError(
        e instanceof GoogleAuthError
          ? 'Session Google expirée : reconnecte-toi puis recommence.'
          : 'Le rendez-vous n’a pas pu être supprimé.',
      )
    }
  }

  function getFormInitial() {
    if (!editingEvent) return undefined
    const start = editingEvent.start.dateTime ? new Date(editingEvent.start.dateTime) : new Date(`${editingEvent.start.date}T09:00`)
    const end = editingEvent.end.dateTime ? new Date(editingEvent.end.dateTime) : new Date(start.getTime() + 60 * 60 * 1000)
    return {
      title: trimEventSummary(editingEvent.summary) || services[0].label,
      start,
      durationMin: Math.max(30, Math.round((end.getTime() - start.getTime()) / 60_000)),
      notes: cleanAppointmentNotes(editingEvent.description),
    }
  }

  return (
    <div className="rounded-lg bg-[#f5eee7] p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#704f3b]">
          Rendez-vous
        </span>
        <button
          onClick={openForm}
          className="inline-flex items-center justify-center rounded-full border border-[#8a6448]/20 bg-gradient-to-r from-[#8a6448] to-[#9f7b60] px-3 py-1.5 text-xs font-semibold tracking-wide text-white shadow-sm"
        >
          + Prendre RDV
        </button>
      </div>

      {error && <p className="text-sm text-[#8f6a52]">{error}</p>}

      {connected && events.length === 0 && (
        <p className="text-sm text-neutral-500">Aucun RDV à venir.</p>
      )}
      {events.length > 0 && (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-neutral-700">{trimEventSummary(ev.summary) || '(sans titre)'}</span>
                <span className="text-neutral-500 tabular-nums">{formatEventStart(ev)}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditForm(ev)}
                  className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-neutral-600 transition hover:bg-white"
                  aria-label="Modifier le rendez-vous"
                >
                  <FontAwesomeIcon icon={faPen} className="text-xs" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(ev)}
                  className="flex h-8 w-8 items-center justify-center rounded border border-[#d7bda3] text-[#8f6a52] transition hover:bg-[#f5eee7]"
                  aria-label="Supprimer le rendez-vous"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <Modal
          title={editingEvent ? `Modifier le RDV — ${client.firstName} ${client.lastName}` : `RDV — ${client.firstName} ${client.lastName}`}
          onClose={closeForm}
        >
          <AppointmentForm
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            initial={getFormInitial()}
            submitLabel={editingEvent ? 'Enregistrer' : 'Créer le RDV'}
            clients={[client]}
            hideClientSelector
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Supprimer ce rendez-vous ?" onClose={closeDeleteConfirm}>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              {trimEventSummary(deleteTarget.summary) || '(sans titre)'}
              <span className="mt-1 block text-neutral-500 tabular-nums">{formatEventStart(deleteTarget)}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 rounded-lg bg-[#9b7558] py-2.5 text-sm font-medium text-white"
              >
                Supprimer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

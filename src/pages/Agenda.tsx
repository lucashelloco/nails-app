import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import {
  createAppointment,
  cleanAppointmentNotes,
  deleteAppointment,
  ensureToken,
  getEventsBetween,
  GoogleAuthError,
  type CalendarEvent,
  updateAppointment,
} from '../lib/googleCalendar'
import { useGoogleConnection } from '../lib/useGoogleConnection'
import Modal from '../components/Modal'
import AppointmentForm, { services as serviceOptions, type AppointmentInput } from '../components/forms/AppointmentForm'
import ClientForm from '../components/forms/ClientForm'
import { addClient, db } from '../db/db'
import type { Client, ClientInput } from '../types'

const HOUR_HEIGHT = 48 // px par heure
const DEFAULT_START_HOUR = 8
const DEFAULT_END_HOUR = 20
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// --- Outils de dates -------------------------------------------------------

function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // lundi = 0
  d.setDate(d.getDate() - day)
  return d
}

type ViewMode = 'week' | 'day'
const VIEW_KEY = 'agenda-view'

/** Mode par défaut : celui choisi la dernière fois, sinon "jour" sur téléphone. */
function initialView(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === 'week' || saved === 'day') return saved
  } catch {
    /* ignore */
  }
  return window.matchMedia('(max-width: 640px)').matches ? 'day' : 'week'
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function hoursOf(d: Date) {
  return d.getHours() + d.getMinutes() / 60
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function cleanEventSummary(summary?: string) {
  return (summary ?? '')
    .replace(/\b(?:\+33|0|00)[0-9\s.-]{8,}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[-–—]\s*$/g, '')
    .trim()
}

function getServiceColor(summary?: string) {
  const raw = cleanEventSummary(summary)
  const serviceName = raw.split(' — ')[0]?.trim().toLowerCase()
  const matched = serviceOptions.find((service) => service.label.toLowerCase() === serviceName)
  return matched?.color ?? '#F9DCE8'
}

// --- Placement des RDV -------------------------------------------------------

interface PlacedEvent {
  event: CalendarEvent
  start: Date
  end: Date
  lane: number // colonne en cas de chevauchement
  lanes: number // nombre total de colonnes du groupe
}

/** Répartit les RDV qui se chevauchent côte à côte dans la journée. */
function layoutDay(events: { event: CalendarEvent; start: Date; end: Date }[]): PlacedEvent[] {
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime())
  const placed: PlacedEvent[] = []
  let group: PlacedEvent[] = []
  let groupEnd = 0

  const flush = () => {
    const lanes = Math.max(1, ...group.map((g) => g.lane + 1))
    group.forEach((g) => (g.lanes = lanes))
    placed.push(...group)
    group = []
  }

  for (const e of sorted) {
    if (group.length && e.start.getTime() >= groupEnd) flush()
    const used = new Set(group.filter((g) => g.end > e.start).map((g) => g.lane))
    let lane = 0
    while (used.has(lane)) lane++
    group.push({ ...e, lane, lanes: 1 })
    groupEnd = Math.max(groupEnd, e.end.getTime())
  }
  if (group.length) flush()
  return placed
}

// --- Composant ----------------------------------------------------------------

export default function Agenda() {
  const connected = useGoogleConnection()
  const [view, setView] = useState<ViewMode>(initialView)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  const [anchor, setAnchor] = useState(() => startOfDay(new Date())) // jour sélectionné
  // Ne recharge l'agenda que si on change de semaine (pas à chaque changement de jour)
  const weekKey = startOfWeek(anchor).getTime()
  const weekStart = useMemo(() => new Date(weekKey), [weekKey])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [clientFormOpen, setClientFormOpen] = useState(false)
  const clients = useLiveQuery(() => db.clients.orderBy('lastName').toArray(), [])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const days = view === 'week'
    ? isMobile
      ? [anchor, addDays(anchor, 1), addDays(anchor, 2)]
      : weekDays
    : [anchor]
  const gridCols = { gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const handleChange = () => setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  function changeView(v: ViewMode) {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* ignore */
    }
  }

  function move(direction: 1 | -1) {
    const step = view === 'day' ? 1 : isMobile ? 3 : 7
    setAnchor(addDays(anchor, direction * step))
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await getEventsBetween(weekStart, addDays(weekStart, 7)))
    } catch (e) {
      console.error(e)
      if (!(e instanceof GoogleAuthError)) setError("Impossible de charger l'agenda.")
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    if (connected) load()
  }, [connected, load])

  // Ligne "maintenant" mise à jour chaque minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Sépare les RDV "journée entière" des RDV avec horaire
  const { allDay, timed } = useMemo(() => {
    const allDay: CalendarEvent[] = []
    const timed: { event: CalendarEvent; start: Date; end: Date }[] = []
    for (const ev of events) {
      if (ev.start.dateTime && ev.end.dateTime) {
        timed.push({ event: ev, start: new Date(ev.start.dateTime), end: new Date(ev.end.dateTime) })
      } else {
        allDay.push(ev)
      }
    }
    return { allDay, timed }
  }, [events])

  // Plage horaire affichée : 8h–20h, élargie si un RDV déborde
  const startHour = Math.min(DEFAULT_START_HOUR, ...timed.map((t) => Math.floor(hoursOf(t.start))))
  const endHour = Math.max(
    DEFAULT_END_HOUR,
    ...timed.map((t) => (sameDay(t.start, t.end) ? Math.ceil(hoursOf(t.end)) : 24)),
  )
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

  const periodLabel = view === 'day'
    ? anchor.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : `${days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${days[days.length - 1].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`

  function getEventClientName(event: CalendarEvent) {
    const summary = cleanEventSummary(event.summary)
    return summary.includes(' — ') ? summary.split(' — ').slice(1).join(' — ').trim() : 'Client'
  }

  function getEventInitial(event: CalendarEvent, clientList: Client[] = []): Partial<AppointmentInput> | undefined {
    const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(`${event.start.date}T09:00`)
    const end = event.end.dateTime ? new Date(event.end.dateTime) : new Date(start.getTime() + 60 * 60 * 1000)
    const durationMin = Math.max(30, Math.round((end.getTime() - start.getTime()) / 60_000))
    const title = cleanEventSummary(event.summary).split(' — ')[0]?.trim() || serviceOptions[0]?.label || 'Rendez-vous'
    const clientId = event.extendedProperties?.private?.clientId ?? 'agenda'
    const selectedClient = clientList.find((client) => client.id === clientId)
    return {
      title,
      start,
      durationMin,
      notes: cleanAppointmentNotes(event.description),
      clientId,
      clientName: selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : getEventClientName(event),
      clientPhone: selectedClient?.phone,
    }
  }

  async function handleDeleteEvent(event: CalendarEvent) {
    try {
      await deleteAppointment(event.id)
      setSelected(null)
      setEditingEvent(null)
      await load()
    } catch (e) {
      console.error(e)
      setError(e instanceof GoogleAuthError ? 'Session Google expirée : reconnecte-toi puis recommence.' : 'Le rendez-vous n’a pas pu être supprimé.')
    }
  }

  async function handleUpdateEvent(input: AppointmentInput) {
    if (!editingEvent) return
    const selectedClient = clients?.find((client) => client.id === input.clientId)
    if (!selectedClient) {
      setError('Un rendez-vous doit être lié à un(e) client(e) existant(e).')
      return
    }
    setSaving(true)
    try {
      await updateAppointment(editingEvent.id, {
        clientId: selectedClient.id,
        clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
        clientPhone: selectedClient.phone,
        title: input.title,
        start: input.start,
        durationMin: input.durationMin,
        notes: input.notes,
      })
      setEditingEvent(null)
      setSelected(null)
      await load()
    } catch (e) {
      console.error(e)
      setError(e instanceof GoogleAuthError ? 'Session Google expirée : reconnecte-toi puis recommence.' : 'Le rendez-vous n’a pas pu être modifié.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateEvent(input: AppointmentInput) {
    const selectedClient = clients?.find((client) => client.id === input.clientId)
    if (!selectedClient) {
      setError('Un rendez-vous doit être lié à un(e) client(e) existant(e).')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createAppointment({
        ...input,
        clientId: selectedClient.id,
        clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
        clientPhone: selectedClient.phone,
      })
      setCreating(false)
      await load()
    } catch (e) {
      console.error(e)
      setError(e instanceof GoogleAuthError ? 'Session Google expirée : reconnecte-toi puis recommence.' : 'Le rendez-vous n’a pas pu être créé.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateClient(input: ClientInput) {
    await addClient(input)
    setClientFormOpen(false)
  }

  if (!connected) {
    return (
      <div className="bg-white rounded-xl border border-[#ead8c7] p-4 space-y-3 text-center">
        <p className="text-sm text-neutral-600">Connecte ton agenda Google pour voir ton agenda.</p>
        {error && <p className="text-sm text-[#8f6a52]">{error}</p>}
        <button
          onClick={() => ensureToken().catch(() => setError('Connexion Google annulée.'))}
          className="w-full rounded-lg bg-[#8a6448] py-2.5 text-sm font-medium text-white"
        >
          Connecter mon agenda Google
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Bascule Jour / Semaine */}
      <div className="grid grid-cols-2 rounded-lg bg-[#f0e3d8] p-1 text-sm font-medium">
        {(['day', 'week'] as const).map((v) => (
          <button key={v} onClick={() => changeView(v)}
            className={`rounded-md py-1.5 ${view === v ? 'bg-white text-[#704f3b] shadow-sm' : 'text-[#9a7355]'}`}>
            {v === 'day' ? 'Jour' : isMobile ? '3 jours' : 'Semaine'}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => move(-1)}
          className="w-9 h-9 rounded-full border border-neutral-300 bg-white"
          aria-label={view === 'day' ? 'Jour précédent' : 'Semaine précédente'}>‹</button>
        <div className="text-center">
          <div className="text-sm font-semibold text-neutral-800 first-letter:uppercase">{periodLabel}</div>
          <button onClick={() => setAnchor(startOfDay(new Date()))} className="text-xs text-[#8a6448]">
            Aujourd'hui
          </button>
        </div>
        <button onClick={() => move(1)}
          className="w-9 h-9 rounded-full border border-neutral-300 bg-white"
          aria-label={view === 'day' ? 'Jour suivant' : 'Semaine suivante'}>›</button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => {
            if (!connected) {
              ensureToken().catch(() => setError('Connexion Google annulée.'))
              return
            }
            setCreating(true)
          }}
          className="w-full rounded-lg bg-[#8a6448] px-4 py-2 text-sm font-medium text-white"
        >
          + Créer un RDV
        </button>
      </div>

      {/* Mode jour : bandeau de la semaine pour sauter d'un jour à l'autre */}
      {view === 'day' && (
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d) => {
            const active = sameDay(d, anchor)
            const count = timed.filter((t) => sameDay(t.start, d)).length
            return (
              <button key={d.toISOString()} onClick={() => setAnchor(d)}
                className={`rounded-lg py-1.5 text-center ${active ? 'bg-[#8a6448] text-white' : 'bg-white text-neutral-700'}`}>
                <div className={`text-[10px] uppercase ${active ? 'text-[#f7e8dc]' : 'text-neutral-400'}`}>
                  {DAY_LABELS[(d.getDay() + 6) % 7]}
                </div>
                <div className={`text-sm font-semibold ${sameDay(d, now) && !active ? 'text-[#8a6448]' : ''}`}>
                  {d.getDate()}
                </div>
                <div className="h-1.5 flex justify-center">
                  {count > 0 && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-[#9a7355]'}`} />}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="text-sm text-[#8f6a52]">{error}</p>}
      {loading && <p className="text-xs text-neutral-400 text-center">Chargement…</p>}

      {/* Grille : défile horizontalement sur téléphone */}
      <div className="bg-white rounded-xl border border-[#ead8c7] overflow-x-auto">
        <div className={view === 'week' && !isMobile ? 'min-w-[640px]' : ''}>
          {/* En-têtes des jours */}
          <div style={gridCols} className="grid border-b border-[#ead8c7] bg-white">
            <div />
            {days.map((d, i) => {
              const today = sameDay(d, now)
              return (
                <div key={i} className="py-2 text-center">
                  <div className="text-[11px] uppercase text-neutral-400">{DAY_LABELS[(d.getDay() + 6) % 7]}</div>
                  <div className={`mx-auto mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                    today ? 'bg-[#8a6448] text-white' : 'text-neutral-700'}`}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* RDV journée entière */}
          {allDay.length > 0 && (
            <div style={gridCols} className="grid border-b border-[#ead8c7] text-[11px]">
              <div className="p-1 text-neutral-400">jour</div>
              {days.map((d, i) => (
                <div key={i} className="p-0.5 space-y-0.5">
                  {allDay
                    .filter((ev) => {
                      const s = new Date(ev.start.date + 'T00:00')
                      const e = new Date(ev.end.date + 'T00:00') // date de fin exclusive
                      return d >= s && d < e
                    })
                    .map((ev) => {
                      const title = cleanEventSummary(ev.summary)
                      const bg = getServiceColor(ev.summary)
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelected(ev)}
                          className="block w-full truncate rounded px-1 text-left"
                          style={{ backgroundColor: `${bg}cc`, color: '#1f2937' }}
                        >
                          {title || '(sans titre)'}
                        </button>
                      )
                    })}
                </div>
              ))}
            </div>
          )}

          {/* Corps horaire */}
          <div style={gridCols} className="grid">
            {/* Colonne des heures */}
            <div>
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
                  <span className="absolute -top-2 right-1.5 text-[10px] text-neutral-400">{h}h</span>
                </div>
              ))}
            </div>

            {days.map((day, i) => {
              const dayEvents = layoutDay(
                timed
                  .filter((t) => sameDay(t.start, day))
                  .map((t) => ({ ...t, end: sameDay(t.start, t.end) ? t.end : addDays(day, 1) })),
              )
              const isToday = sameDay(day, now)
              return (
                <div key={i} className={`relative border-l border-[#f3e7dd] ${isToday ? 'bg-[#f8f2ee]/40' : ''}`}>
                  {hours.map((h) => (
                    <div key={h} style={{ height: HOUR_HEIGHT }} className="border-t border-neutral-100" />
                  ))}

                  {isToday && hoursOf(now) >= startHour && hoursOf(now) <= endHour && (
                    <div className="absolute inset-x-0 h-0.5 bg-[#9b7558] z-[2]"
                      style={{ top: (hoursOf(now) - startHour) * HOUR_HEIGHT }} />
                  )}

                  {dayEvents.map(({ event, start, end, lane, lanes }) => {
                    const top = (hoursOf(start) - startHour) * HOUR_HEIGHT
                    const endH = sameDay(start, end) ? hoursOf(end) : 24
                    const height = Math.max((endH - hoursOf(start)) * HOUR_HEIGHT - 2, 18)
                    const parts = cleanEventSummary(event.summary).split(' — ').map((part) => part.trim()).filter(Boolean)
                    const service = parts[0] ?? '(sans titre)'
                    const client = parts[1]
                    const bg = getServiceColor(event.summary)
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelected(event)}
                        className={`absolute overflow-hidden rounded-md text-left leading-tight shadow-sm ${
                          view === 'day' ? 'px-2 py-1 text-xs' : 'px-1 py-0.5 text-[11px]'}`}
                        style={{
                          top,
                          height,
                          left: `calc(${(lane / lanes) * 100}% + 1px)`,
                          width: `calc(${100 / lanes}% - 2px)`,
                          backgroundColor: bg,
                          color: '#1f2937',
                        }}
                      >
                        <div className="font-semibold truncate">{client ?? service}</div>
                        {client && height > 30 && <div className="truncate opacity-90">{service}</div>}
                        {view === 'day' && height > 60 && event.description && (
                          <div className="truncate opacity-80">{event.description.split('\n')[0]}</div>
                        )}
                        {height > 44 && <div className="opacity-80">{fmtTime(start)}–{fmtTime(end)}</div>}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selected && (
        <Modal title={selected.summary ?? 'Rendez-vous'} onClose={() => setSelected(null)}>
          <div className="space-y-2 text-sm text-neutral-700">
            <p>
              {selected.start.dateTime
                ? `${new Date(selected.start.dateTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${fmtTime(new Date(selected.start.dateTime))} – ${fmtTime(new Date(selected.end.dateTime!))}`
                : 'Journée entière'}
            </p>
            {selected.location && <p>📍 {selected.location}</p>}
            {selected.description && <p className="whitespace-pre-wrap text-neutral-600">{cleanEventSummary(selected.description)}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEvent(selected)}
                className="flex h-9 w-9 items-center justify-center rounded border border-neutral-300 text-neutral-600 transition hover:bg-neutral-50"
                aria-label="Modifier le rendez-vous"
              >
                <FontAwesomeIcon icon={faPen} className="text-sm" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEvent(selected)}
                className="flex h-9 w-9 items-center justify-center rounded border border-[#d7bda3] text-[#8f6a52] transition hover:bg-[#f5eee7]"
                aria-label="Supprimer le rendez-vous"
              >
                <FontAwesomeIcon icon={faTrash} className="text-sm" />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {creating && (
        <Modal title="Nouveau rendez-vous" onClose={() => setCreating(false)}>
          <AppointmentForm
            saving={saving}
            onSubmit={handleCreateEvent}
            onCancel={() => setCreating(false)}
            submitLabel="Créer le RDV"
            clients={clients ?? []}
            onCreateClient={() => setClientFormOpen(true)}
          />
        </Modal>
      )}

      {clientFormOpen && (
        <Modal title="Nouveau / nouvelle client(e)" onClose={() => setClientFormOpen(false)}>
          <ClientForm
            onSubmit={handleCreateClient}
            onCancel={() => setClientFormOpen(false)}
          />
        </Modal>
      )}

      {editingEvent && (
        <Modal title={`Modifier le RDV`} onClose={() => setEditingEvent(null)}>
          <AppointmentForm
            saving={saving}
            initial={getEventInitial(editingEvent, clients ?? [])}
            onSubmit={handleUpdateEvent}
            onCancel={() => setEditingEvent(null)}
            submitLabel="Enregistrer"
            clients={clients ?? []}
            onCreateClient={() => setClientFormOpen(true)}
          />
        </Modal>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ensureToken,
  getEventsBetween,
  GoogleAuthError,
  type CalendarEvent,
} from '../lib/googleCalendar'
import { useGoogleConnection } from '../lib/useGoogleConnection'
import Modal from '../components/Modal'

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
  const [anchor, setAnchor] = useState(() => startOfDay(new Date())) // jour sélectionné
  // Ne recharge l'agenda que si on change de semaine (pas à chaque changement de jour)
  const weekKey = startOfWeek(anchor).getTime()
  const weekStart = useMemo(() => new Date(weekKey), [weekKey])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [now, setNow] = useState(() => new Date())

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const days = view === 'week' ? weekDays : [anchor]
  const gridCols = { gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }

  function changeView(v: ViewMode) {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* ignore */
    }
  }

  function move(direction: 1 | -1) {
    setAnchor(addDays(anchor, direction * (view === 'week' ? 7 : 1)))
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
    : `${days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`

  if (!connected) {
    return (
      <div className="bg-white rounded-xl border border-rose-100 p-4 space-y-3 text-center">
        <p className="text-sm text-neutral-600">Connecte ton agenda Google pour voir ta semaine.</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={() => ensureToken().catch(() => setError('Connexion Google annulée.'))}
          className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-medium text-white"
        >
          Connecter mon agenda Google
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Bascule Jour / Semaine */}
      <div className="grid grid-cols-2 rounded-lg bg-rose-100 p-1 text-sm font-medium">
        {(['day', 'week'] as const).map((v) => (
          <button key={v} onClick={() => changeView(v)}
            className={`rounded-md py-1.5 ${view === v ? 'bg-white text-rose-700 shadow-sm' : 'text-rose-500'}`}>
            {v === 'day' ? 'Jour' : 'Semaine'}
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
          <button onClick={() => setAnchor(startOfDay(new Date()))} className="text-xs text-rose-600">
            Aujourd'hui
          </button>
        </div>
        <button onClick={() => move(1)}
          className="w-9 h-9 rounded-full border border-neutral-300 bg-white"
          aria-label={view === 'day' ? 'Jour suivant' : 'Semaine suivante'}>›</button>
      </div>

      {/* Mode jour : bandeau de la semaine pour sauter d'un jour à l'autre */}
      {view === 'day' && (
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((d) => {
            const active = sameDay(d, anchor)
            const count = timed.filter((t) => sameDay(t.start, d)).length
            return (
              <button key={d.toISOString()} onClick={() => setAnchor(d)}
                className={`rounded-lg py-1.5 text-center ${active ? 'bg-rose-600 text-white' : 'bg-white text-neutral-700'}`}>
                <div className={`text-[10px] uppercase ${active ? 'text-rose-100' : 'text-neutral-400'}`}>
                  {DAY_LABELS[(d.getDay() + 6) % 7]}
                </div>
                <div className={`text-sm font-semibold ${sameDay(d, now) && !active ? 'text-rose-600' : ''}`}>
                  {d.getDate()}
                </div>
                <div className="h-1.5 flex justify-center">
                  {count > 0 && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-rose-500'}`} />}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-xs text-neutral-400 text-center">Chargement…</p>}

      {/* Grille : défile horizontalement sur téléphone */}
      <div className="bg-white rounded-xl border border-rose-100 overflow-x-auto">
        <div className={view === 'week' ? 'min-w-[640px]' : ''}>
          {/* En-têtes des jours */}
          <div style={gridCols} className="grid border-b border-rose-100 bg-white">
            <div />
            {days.map((d, i) => {
              const today = sameDay(d, now)
              return (
                <div key={i} className="py-2 text-center">
                  <div className="text-[11px] uppercase text-neutral-400">{DAY_LABELS[(d.getDay() + 6) % 7]}</div>
                  <div className={`mx-auto mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                    today ? 'bg-rose-600 text-white' : 'text-neutral-700'}`}>
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* RDV journée entière */}
          {allDay.length > 0 && (
            <div style={gridCols} className="grid border-b border-rose-100 text-[11px]">
              <div className="p-1 text-neutral-400">jour</div>
              {days.map((d, i) => (
                <div key={i} className="p-0.5 space-y-0.5">
                  {allDay
                    .filter((ev) => {
                      const s = new Date(ev.start.date + 'T00:00')
                      const e = new Date(ev.end.date + 'T00:00') // date de fin exclusive
                      return d >= s && d < e
                    })
                    .map((ev) => (
                      <button key={ev.id} onClick={() => setSelected(ev)}
                        className="block w-full truncate rounded bg-rose-100 px-1 text-left text-rose-800">
                        {ev.summary ?? '(sans titre)'}
                      </button>
                    ))}
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
                <div key={i} className={`relative border-l border-rose-50 ${isToday ? 'bg-rose-50/40' : ''}`}>
                  {hours.map((h) => (
                    <div key={h} style={{ height: HOUR_HEIGHT }} className="border-t border-neutral-100" />
                  ))}

                  {isToday && hoursOf(now) >= startHour && hoursOf(now) <= endHour && (
                    <div className="absolute inset-x-0 h-0.5 bg-red-500 z-[2]"
                      style={{ top: (hoursOf(now) - startHour) * HOUR_HEIGHT }} />
                  )}

                  {dayEvents.map(({ event, start, end, lane, lanes }) => {
                    const top = (hoursOf(start) - startHour) * HOUR_HEIGHT
                    const endH = sameDay(start, end) ? hoursOf(end) : 24
                    const height = Math.max((endH - hoursOf(start)) * HOUR_HEIGHT - 2, 18)
                    const [service, client] = (event.summary ?? '(sans titre)').split(' — ')
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelected(event)}
                        className={`absolute overflow-hidden rounded-md bg-rose-600/90 text-left leading-tight text-white shadow-sm ${
                          view === 'day' ? 'px-2 py-1 text-xs' : 'px-1 py-0.5 text-[11px]'}`}
                        style={{
                          top,
                          height,
                          left: `calc(${(lane / lanes) * 100}% + 1px)`,
                          width: `calc(${100 / lanes}% - 2px)`,
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
            {selected.description && <p className="whitespace-pre-wrap text-neutral-600">{selected.description}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}

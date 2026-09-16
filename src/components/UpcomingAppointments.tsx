import { useCallback, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRotate } from '@fortawesome/free-solid-svg-icons'
import {
  disconnectGoogle,
  ensureToken,
  formatEventStart,
  getUpcomingEvents,
  GoogleAuthError,
  type CalendarEvent,
} from '../lib/googleCalendar'
import { useGoogleConnection } from '../lib/useGoogleConnection'

const DAYS_AHEAD = 7

export default function UpcomingAppointments() {
  const connected = useGoogleConnection()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await getUpcomingEvents({ days: DAYS_AHEAD, max: 50 }))
    } catch (e) {
      console.error(e)
      if (!(e instanceof GoogleAuthError)) setError("Impossible de récupérer l'agenda.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Recharge automatiquement dès qu'on est connecté (y compris à l'ouverture
  // de l'appli si le jeton enregistré est encore valide).
  useEffect(() => {
    if (connected) load()
  }, [connected, load])

  function handleConnect() {
    setError(null)
    ensureToken().catch((e) => {
      console.error(e)
      setError('Connexion Google annulée ou refusée.')
    })
  }

  return (
    <div className="bg-white rounded-xl border border-[#ead8c7] p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-neutral-700">
          Rendez-vous des {DAYS_AHEAD} prochains jours
        </h2>
        {connected && (
          <div className="flex gap-3">
            <button onClick={load} className="text-xs font-medium text-[#8a6448]">
              <FontAwesomeIcon icon={faRotate} aria-hidden="true" />
              <span className="sr-only">Actualiser</span>
            </button>
            <button onClick={disconnectGoogle} className="text-xs text-neutral-400">
              Déconnecter
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[#8f6a52] mb-2">{error}</p>}

      {!connected ? (
        <button
          onClick={handleConnect}
          className="w-full rounded-lg bg-[#8a6448] py-2.5 text-sm font-medium text-white"
        >
          Connecter mon agenda Google
        </button>
      ) : loading ? (
        <p className="text-sm text-neutral-500">Chargement…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-neutral-500">Aucun rendez-vous dans les {DAYS_AHEAD} prochains jours.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-neutral-700">{event.summary ?? '(sans titre)'}</span>
              <span className="shrink-0 text-neutral-500 tabular-nums">
                {formatEventStart(event)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

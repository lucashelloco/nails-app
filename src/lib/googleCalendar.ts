// Accès à Google Agenda depuis le navigateur (sans backend).
// Le jeton d'accès Google dure ~1 h : on le garde dans localStorage pour
// rester connecté entre deux ouvertures de l'appli pendant cette durée.
// Passé ce délai, un clic sur "Se reconnecter" redemande un jeton sans
// réafficher l'écran de consentement (prompt: '').

const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const STORAGE_KEY = 'gcal-token'
const AUTH_EVENT = 'gcal-auth-change'
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export interface CalendarEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

export class GoogleAuthError extends Error {}

interface StoredToken {
  token: string
  expiresAt: number
}

function readToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredToken
    // marge de 60 s pour éviter un jeton qui expire en plein appel
    return parsed.expiresAt - 60_000 > Date.now() ? parsed : null
  } catch {
    return null
  }
}

function saveToken(token: string, expiresInSec: number) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token, expiresAt: Date.now() + expiresInSec * 1000 }),
    )
  } catch {
    /* stockage indisponible (navigation privée) : on reste en mémoire */
  }
  memoryToken = token
  window.dispatchEvent(new Event(AUTH_EVENT))
}

function clearToken() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  memoryToken = null
  window.dispatchEvent(new Event(AUTH_EVENT))
}

let memoryToken: string | null = readToken()?.token ?? null

function currentToken() {
  return readToken()?.token ?? memoryToken
}

export function isConnected() {
  return currentToken() !== null
}

/** S'abonner aux changements de connexion (renvoie la fonction de désabonnement). */
export function onAuthChange(cb: () => void) {
  window.addEventListener(AUTH_EVENT, cb)
  return () => window.removeEventListener(AUTH_EVENT, cb)
}

/**
 * Garantit un jeton valide. Si besoin, ouvre la fenêtre Google.
 * ⚠️ À appeler directement dans un gestionnaire de clic (sans `await`
 * avant), sinon Safari/iOS bloque la fenêtre popup.
 */
export function ensureToken(): Promise<string> {
  const existing = currentToken()
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: SCOPE,
      prompt: '', // consentement demandé seulement la première fois
      callback: (resp) => {
        if (resp.error) return reject(new GoogleAuthError(resp.error))
        saveToken(resp.access_token, Number(resp.expires_in))
        resolve(resp.access_token)
      },
      error_callback: (err) => reject(new GoogleAuthError(err.type)),
    })
    client.requestAccessToken()
  })
}

export function disconnectGoogle() {
  const token = currentToken()
  if (token) google.accounts.oauth2.revoke(token, () => {})
  clearToken()
}

async function apiFetch(url: string, init: RequestInit = {}) {
  const token = currentToken()
  if (!token) throw new GoogleAuthError('not_connected')
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (res.status === 401) {
    clearToken()
    throw new GoogleAuthError('expired')
  }
  if (!res.ok) throw new Error(`Google Calendar : ${res.status}`)
  return res.json()
}

export async function getUpcomingEvents(
  options: { clientId?: string; max?: number; days?: number } = {},
) {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: String(options.max ?? 10),
    singleEvents: 'true',
    orderBy: 'startTime',
  })
  // Limite optionnelle : seulement les N prochains jours
  if (options.days) {
    params.set('timeMax', new Date(Date.now() + options.days * 86_400_000).toISOString())
  }
  if (options.clientId) {
    params.set('privateExtendedProperty', `clientId=${options.clientId}`)
  }
  const data = await apiFetch(`${API}?${params}`)
  return (data.items ?? []) as CalendarEvent[]
}

/** Tous les événements (RDV) entre deux dates, triés par heure de début. */
export async function getEventsBetween(from: Date, to: Date) {
  const params = new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    maxResults: '250',
    singleEvents: 'true',
    orderBy: 'startTime',
  })
  const data = await apiFetch(`${API}?${params}`)
  return (data.items ?? []) as CalendarEvent[]
}

export interface NewAppointment {
  clientId: string
  clientName: string
  clientPhone?: string
  title: string
  start: Date
  durationMin: number
  notes?: string
}

export async function createAppointment(a: NewAppointment) {
  const end = new Date(a.start.getTime() + a.durationMin * 60_000)
  const description = [a.clientPhone && `Tél : ${a.clientPhone}`, a.notes]
    .filter(Boolean)
    .join('\n')
  return (await apiFetch(API, {
    method: 'POST',
    body: JSON.stringify({
      summary: `${a.title} — ${a.clientName}`,
      description,
      start: { dateTime: a.start.toISOString(), timeZone: 'Europe/Paris' },
      end: { dateTime: end.toISOString(), timeZone: 'Europe/Paris' },
      // Permet de retrouver les RDV d'une cliente depuis sa fiche
      extendedProperties: { private: { clientId: a.clientId } },
    }),
  })) as CalendarEvent
}

export function formatEventStart(event: CalendarEvent) {
  if (event.start.date && !event.start.dateTime) {
    return new Date(event.start.date).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }
  return new Date(event.start.dateTime!).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

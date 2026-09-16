import { useEffect, useState } from 'react'
import { isConnected, onAuthChange } from './googleCalendar'

/** État de connexion Google partagé entre tous les composants. */
export function useGoogleConnection() {
  const [connected, setConnected] = useState(isConnected)
  useEffect(() => onAuthChange(() => setConnected(isConnected())), [])
  return connected
}

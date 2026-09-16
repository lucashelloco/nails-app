import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarAlt,
  faCog,
  faHome,
  faPills,
  faPowerOff,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { useOnline } from '../lib/useOnline'
import { signOut } from '../lib/auth'
import { getAppName } from '../lib/appSettings'

const tabs = [
  { to: '/', label: 'Accueil', icon: faHome, end: true },
  { to: '/agenda', label: 'Agenda', icon: faCalendarAlt, end: false },
  { to: '/stock', label: 'Stock', icon: faPills, end: false },
  { to: '/clientes', label: 'Client(e)s', icon: faUsers, end: false },
  { to: '/settings', label: 'Paramètres', icon: faCog, end: false },
]

export default function Layout() {
  const online = useOnline()
  const [appName, setAppName] = useState(getAppName)

  useEffect(() => {
    const refreshAppName = () => setAppName(getAppName())
    window.addEventListener('app-name-change', refreshAppName)
    return () => window.removeEventListener('app-name-change', refreshAppName)
  }, [])

  return (
    <div className="min-h-dvh flex flex-col bg-[#f5eee7] text-neutral-800" style={{backgroundColor:'#CDE0CD'}}>
      <header className="sticky top-0 z-10 bg-[#8a6448] text-white shadow-sm" style={{backgroundColor:'#3B6B54'}}>
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-semibold flex-1">{appName}</h1>
          {!online && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
              Hors ligne · lecture seule
            </span>
          )}
          <button
            onClick={() => {
              if (confirm('Se déconnecter de cet appareil ?')) signOut()
            }}
            aria-label="Déconnexion"
            title="Déconnexion"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#f7e8dc] hover:bg-white/15 hover:text-white"
          >
            <FontAwesomeIcon icon={faPowerOff} />
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-[#d7bda3] bg-white">
        <div className="mx-auto max-w-2xl grid grid-cols-5 px-3 sm:px-0">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              aria-label={tab.label}
              className={({ isActive }) =>
                `group flex flex-col items-center gap-0.5 px-0 py-3 sm:py-2.5 text-xs font-medium transition-colors hover:bg-[#f5eee7] hover:text-[#8a6448] ${
                  isActive ? 'text-[#8a6448]' : 'text-neutral-400'
                }`
              }
            >
              <FontAwesomeIcon icon={tab.icon} className="text-lg leading-none transition-transform duration-150 group-hover:scale-110" />
              <span className="hidden sm:inline">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

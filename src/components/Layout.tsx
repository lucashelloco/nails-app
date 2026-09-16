import { NavLink, Outlet } from 'react-router-dom'
import { useOnline } from '../lib/useOnline'
import { signOut } from '../lib/auth'

const tabs = [
  { to: '/', label: 'Accueil', icon: '🏠', end: true },
  { to: '/agenda', label: 'Agenda', icon: '📅', end: false },
  { to: '/stock', label: 'Stock', icon: '🧴', end: false },
  { to: '/clientes', label: 'Clientes', icon: '👥', end: false },
]

export default function Layout() {
  const online = useOnline()

  return (
    <div className="min-h-dvh flex flex-col bg-rose-50 text-neutral-800">
      <header className="sticky top-0 z-10 bg-rose-600 text-white shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-semibold flex-1">💅 Mon Institut</h1>
          {!online && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
              Hors ligne · lecture seule
            </span>
          )}
          <button
            onClick={() => {
              if (confirm('Se déconnecter de cet appareil ?')) signOut()
            }}
            className="text-xs text-rose-100 hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-rose-200 bg-white">
        <div className="mx-auto max-w-2xl grid grid-cols-4">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-rose-600' : 'text-neutral-400'
                }`
              }
            >
              <span className="text-xl leading-none" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

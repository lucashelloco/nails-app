import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Stock from './pages/Stock'
import Clients from './pages/Clients'
import Agenda from './pages/Agenda'
import Login from './pages/Login'
import { useSession } from './lib/useSession'
import { startSync } from './db/sync'

export default function App() {
  const { session, loading } = useSession()
  const userId = session?.user.id

  // Synchronisation avec Supabase tant qu'un compte est connecté
  useEffect(() => {
    if (userId) return startSync(userId)
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-rose-50 text-sm text-neutral-500">
        Chargement…
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="stock" element={<Stock />} />
          <Route path="clientes" element={<Clients />} />
          <Route path="agenda" element={<Agenda />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

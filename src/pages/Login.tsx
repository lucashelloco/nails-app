import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

const inputClass =
  'w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400'

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

function authErrorMessage(message: string) {
  if (!navigator.onLine) return 'Pas de connexion internet.'
  if (message.includes('Invalid login')) return 'Email ou mot de passe incorrect.'
  if (/sign ?ups? not allowed/i.test(message)) return "Ce compte n'est pas autorisé à utiliser l'appli."
  return 'Connexion impossible, réessaie.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleButton = useRef<HTMLDivElement>(null)

  // Bouton « Se connecter avec Google » (Google Identity Services).
  // Google renvoie un jeton d'identité que Supabase vérifie : pas de
  // redirection, donc ça reste dans la PWA installée.
  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    async function setup() {
      // Le script Google est chargé en async dans index.html
      if (typeof google === 'undefined' || !google.accounts?.id) {
        timer = window.setTimeout(setup, 200)
        return
      }
      // Nonce anti-rejeu : haché pour Google, en clair pour Supabase
      const nonce = crypto.randomUUID()
      const hashedNonce = await sha256Hex(nonce)
      if (cancelled || !googleButton.current) return

      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        nonce: hashedNonce,
        callback: async ({ credential }) => {
          setLoading(true)
          setError(null)
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credential,
            nonce,
          })
          setLoading(false)
          if (error) {
            console.error(error)
            setError(authErrorMessage(error.message))
          }
        },
      })
      google.accounts.id.renderButton(googleButton.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        locale: 'fr',
        width: 300,
      })
    }

    setup()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setError(authErrorMessage(error.message))
    // En cas de succès, useSession() détecte la session et affiche l'appli.
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-rose-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl border border-rose-100 p-6 space-y-4 shadow-sm">
        <div className="text-center">
          <div className="text-3xl">💅</div>
          <h1 className="mt-1 text-lg font-semibold text-neutral-800">Mon Institut</h1>
          <p className="text-sm text-neutral-500">Connecte-toi pour retrouver tes données</p>
        </div>

        <div ref={googleButton} className="flex justify-center min-h-[44px]" />

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200" />
          ou avec un mot de passe
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Email</label>
          <input type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Mot de passe</label>
          <input type="password" required autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-rose-600 py-2.5 font-medium text-white disabled:opacity-50">
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}

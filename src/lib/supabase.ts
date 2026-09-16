import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants (voir .env.example)')
}

// La session est gardée dans localStorage : on reste connecté entre deux
// ouvertures de l'appli, et on peut consulter les données hors ligne.
export const supabase = createClient(url, key)

# Onglerie — Stock & Clientes

Application web progressive (PWA) pour gérer le stock et le fichier client
d'une activité de prothésie ongulaire. React + TypeScript + Vite, données
stockées en local sur l'appareil (IndexedDB via Dexie), donc utilisable
hors connexion une fois installée.

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvre l'URL affichée (en général http://localhost:5173). Sur mobile, ouvre
la même URL depuis le téléphone connecté au même réseau (Vite affiche
aussi une adresse réseau au démarrage avec `--host`).

## Construire pour la production

```bash
npm run build
npm run preview   # pour tester le build localement
```

`npm run build` génère le dossier `dist/`, prêt à héberger sur n'importe
quel hébergeur de fichiers statiques (Netlify, Vercel, GitHub Pages,
OVH...). Un hébergement en HTTPS est nécessaire pour que la PWA
s'installe correctement.

## Déploiement (Vercel)

1. Pousser le projet sur GitHub.
2. Sur vercel.com : *Add New → Project*, importer le repo (preset Vite détecté automatiquement).
3. Dans *Environment Variables*, ajouter `VITE_GOOGLE_CLIENT_ID`, `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (voir `.env.example`), puis déployer.
4. Dans Google Cloud (Identifiants → client OAuth), ajouter l'URL Vercel (`https://….vercel.app`) aux *Origines JavaScript autorisées*.

`vercel.json` redirige toutes les routes (`/agenda`, `/clientes`…) vers `index.html` et empêche la mise en cache du service worker, pour que les mises à jour arrivent bien sur les téléphones.

## Installer l'appli sur le téléphone

Une fois déployée en HTTPS : ouvrir le site dans Safari (iPhone) ou
Chrome (Android), puis « Ajouter à l'écran d'accueil ». L'appli
s'ouvrira ensuite comme une appli native, avec son icône, sans barre
d'adresse, et fonctionnera aussi hors connexion (données déjà
enregistrées sur l'appareil).

## Structure du projet

```
src/
  db/db.ts              schéma Dexie (IndexedDB) + fonctions CRUD
  types/index.ts         types Product / Client
  components/            Layout (nav), Modal, formulaires
  pages/                 Dashboard, Stock, Clients
```

- **Stock** : liste de produits, recherche, +/- rapide sur la quantité,
  alerte visuelle "stock bas" quand la quantité passe sous le seuil
  défini par produit.
- **Clientes** : fiche par cliente (coordonnées + notes libres —
  préférences, allergies, technique habituelle…), recherche par nom ou
  téléphone.
- **Accueil** : compteurs stock/clientes + liste des produits en stock
  bas.

## Base de données (Supabase)

Les données (stock, clientes) sont stockées dans **Supabase** et partagées
entre tous les appareils connectés au même compte (Mac, iPhone, iPad…).
Chaque appareil en garde une copie locale (IndexedDB via Dexie) : les
données restent **consultables hors ligne**, mais les modifications
demandent une connexion.

Mise en place (une seule fois) :

1. Créer un projet sur supabase.com (région Europe, ex. Paris).
2. *SQL Editor* → coller le contenu de `supabase/schema.sql` → *Run*.
3. *Authentication → Sign In / Providers → Google* : activer, renseigner
   le Client ID et le Client Secret du client OAuth Google (le secret reste
   côté Supabase, jamais dans l'appli).
4. Se connecter une première fois avec Google (ou créer un compte
   email/mot de passe via *Authentication → Users → Add user*), puis dans
   *Sign In / Providers* désactiver *Allow new users to sign up* :
   plus personne d'autre ne pourra créer de compte.
5. *Project Settings → API* : copier l'URL et la clé publique dans
   `.env.local` (voir `.env.example`) et dans les variables d'environnement
   Vercel.

Au premier login sur un appareil, les données déjà saisies localement
sont envoyées automatiquement vers Supabase.

## Pistes pour la suite

- **Lien agenda** : ta cliente utilise l'app *Calendars* sur iPhone.
  Deux pistes possibles plus tard :
  1. **Export/partage .ics** : la plupart des apps calendrier (dont
     Calendars) savent importer un fichier `.ics` ou s'abonner à un
     flux `webcal://`. On pourrait générer un flux en lecture seule
     depuis les rendez-vous programmés dans l'app.
  2. **Sync bidirectionnelle** via un compte iCloud/Google Calendar
     connecté (plus complexe, nécessite un petit serveur).
  On regardera ça une fois que la partie stock/clientes est validée par
  la cliente.
- **Icônes PWA** : celles fournies (`public/icons/`) sont des
  placeholders générés automatiquement — à remplacer par un vrai logo
  avant la mise en production.
- **Historique de consommation produit** : si utile, on peut ajouter un
  journal des mouvements de stock (quel produit, quelle quantité,
  quand) plutôt qu'un simple compteur.
# nails-app
# nails-app
# nails-app
# nails-app

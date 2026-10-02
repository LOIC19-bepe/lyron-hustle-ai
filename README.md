# 🚀 AI Business Copilot

SaaS de pilotage pour petites entreprises, commerçants et indépendants.
L'entrepreneur suit ses **ventes, dépenses, clients, paiements et dettes**, et
un **assistant IA** explique ses chiffres en langage simple.

> Ton business. Tes chiffres. Tes décisions.

## Principes clés

- **Le backend est la source de vérité** : chiffre d'affaires, dépenses,
  bénéfice, montants à recevoir — tout est calculé côté serveur (`src/server/finance.ts`).
- **L'IA n'invente jamais de chiffres** : elle reçoit un snapshot de données
  pré-calculées et ne fait que les interpréter (`src/server/ai/`).
- **Multi-devises** : la devise vient du profil du business (XAF, XOF, USD,
  EUR, GBP, NGN, GHS, KES…). Aucune devise codée en dur.
- **Isolation des données** : chaque requête est filtrée par le `businessId`
  de l'utilisateur authentifié.
- **Mobile-first** : sidebar desktop, bottom-nav mobile, bouton d'action rapide.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS (Next.js App Router) |
| Backend | API REST Next.js (route handlers, architecture route → service → DB) |
| Base de données | PostgreSQL + Drizzle ORM |
| Auth | JWT (cookie httpOnly) + bcryptjs |
| Validation | Zod |
| IA | `AIService` indépendant du fournisseur (LLM OpenAI-compatible en option + analyste déterministe en secours) |

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseigner DATABASE_URL et JWT_SECRET
npx drizzle-kit push   # applique le schéma
npm run dev
```

Sous Windows / PowerShell : `Copy-Item .env.example .env`

**JWT_SECRET est obligatoire** (l'application refuse de démarrer sans). Générer :

```bash
# Linux / macOS
openssl rand -hex 32
# PowerShell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

> ⚠️ Rate limiting : implémentation en mémoire adaptée au MVP mono-instance.
> Pour un déploiement multi-instance, brancher un store partagé (Redis) —
> voir `docs/architecture.md`.

## API

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Session courante |
| GET/POST/PUT | `/api/business` | Entreprise |
| GET/POST | `/api/sales` · `/api/sales/:id` (GET/PUT/DELETE) | Ventes |
| GET/POST | `/api/expenses` · `/api/expenses/:id` (PUT/DELETE) | Dépenses |
| GET/POST | `/api/customers` · `/api/customers/:id` (GET/PUT/DELETE) | Clients |
| GET | `/api/dashboard` | Indicateurs + série 30 jours |
| GET | `/api/reports?period=today|7d|30d|custom&from&to` | Rapports |
| POST | `/api/ai/chat` | Assistant IA |

## Activer un vrai LLM (optionnel)

L'assistant fonctionne sans clé grâce au provider déterministe. Pour brancher
un LLM (OpenAI, Groq, Mistral… — toute API compatible OpenAI) :

```
AI_API_KEY=sk-...
AI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

## Paiements Flutterwave (mode TEST)

Le checkout utilise Flutterwave Standard côté serveur. Il n'active aucun plan ni crédit avant que l'API Flutterwave confirme la transaction et que son `tx_ref`, son identifiant, son montant, sa devise et son plan soient vérifiés.

1. Copier `.env.example` vers `.env` et renseigner `DATABASE_URL`, `JWT_SECRET`, `APP_URL=http://localhost:3000`, `FLW_MODE=test`, `FLW_PUBLIC_KEY`, `FLW_SECRET_KEY` (clé TEST) et `FLW_WEBHOOK_SECRET` (secret hash du webhook).
2. Appliquer les tables Drizzle avec `npx drizzle-kit push`.
3. Dans le Dashboard Flutterwave, activer les méthodes de paiement nécessaires, désactiver « Disable preferred payment methods » pour permettre les options envoyées à Standard, puis configurer l'URL `https://<domaine-public>/api/payments/webhook` et le même secret hash que `FLW_WEBHOOK_SECRET`.
4. Pour les webhooks locaux, exposer temporairement `localhost:3000` via un tunnel HTTPS et utiliser son URL dans Flutterwave ainsi que dans `APP_URL`.
5. Tester avec une clé TEST et les moyens de test décrits dans la [documentation Flutterwave](https://developer.flutterwave.com/docs/testing). Vérifier le retour `/checkout/result`, l'état `successful` dans `payments`, l'abonnement, le solde et la transaction de crédits.

Les cartes sont saisies exclusivement sur le checkout hébergé Flutterwave; LYRON HUSTLE AI ne reçoit ni ne stocke leur numéro, CVV ou date d'expiration. Cette intégration refuse tout mode autre que `FLW_MODE=test` et toute clé qui n'est pas une clé TEST. Les moyens MTN/Orange et leur disponibilité dépendent de l'activation de Mobile Money francophone sur le compte marchand.

## Roadmap

FREE / PRO / BUSINESS (architecture prête), Mobile Money, WhatsApp,
inventaire, notifications, multi-utilisateurs, API publique.

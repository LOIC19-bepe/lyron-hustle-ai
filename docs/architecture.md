# Architecture — AI Business Copilot

## Vue d'ensemble

```
Frontend (React / Next.js App Router)
  └── pages client : dashboard, ventes, dépenses, clients, rapports, assistant, paramètres
        │  fetch (cookie httpOnly JWT)
        ▼
API REST (route handlers Next.js)  — équivalent couche Express
  └── route → validation (Zod) → auth (JWT) → service → Drizzle ORM → PostgreSQL
        │
        ├── src/server/auth.ts        : session, hash bcrypt, isolation par business
        ├── src/server/finance.ts     : TOUS les calculs financiers (source de vérité)
        └── src/server/ai/            : couche IA indépendante du fournisseur
              ├── aiService.ts        : orchestration + fallback
              ├── llmProvider.ts      : provider OpenAI-compatible (optionnel, via env)
              ├── ruleBasedProvider.ts: analyste déterministe (sans clé API)
              └── snapshot.ts         : snapshot de chiffres pré-calculés pour l'IA
```

## Rate limiting (MVP)

`src/server/rateLimit.ts` : fenêtre glissante **en mémoire de processus**.
Limites : login 10/15 min/IP · register 5/h/IP · IA 20/min/utilisateur → HTTP 429.

⚠️ **Limite connue (déploiement multi-instance)** : le compteur vit dans la
mémoire de chaque instance Node. En cas de scale-out (plusieurs replicas,
serverless), chaque instance a son propre compteur et la limite effective est
multipliée. Avant un déploiement multi-instance, remplacer le store par un
backend partagé (Redis/Upstash) en conservant la même interface
`enforceRateLimit(key, limit, windowMs)`.

## Stratégie monétaire

- PostgreSQL `numeric(14,2)` = capacité de stockage (inchangée, migration non nécessaire).
- Côté application : chaînes exactes ↔ **centimes entiers** (`src/server/money.ts`), aucun flottant dans les calculs.
- Exposant par devise (ISO 4217) : XAF/XOF = 0 décimale, EUR/USD/GBP/NGN/GHS/KES = 2.
  Une saisie plus précise que la devise du business est rejetée (ex. `150.50 XAF` → 400).
- `total = quantity × unitPrice` et `paymentStatus` sont recalculés par le serveur à chaque écriture.

## Périodes & timezone

Une seule définition (`src/server/periods.ts`), calculée dans le fuseau du
business (`businesses.timezone`, IANA) : today / 7d / 30d / custom (borné à
366 jours). Dashboard, rapports et snapshot IA partagent exactement ces bornes.
Les dates saisies (AAAA-MM-JJ) sont ancrées à midi dans le fuseau du business
pour éviter tout glissement de jour à l'affichage.

## Règles de sécurité

1. Mots de passe hashés (bcryptjs, 10 rounds).
2. JWT signé, stocké en cookie httpOnly `abc_token` (7 jours).
3. Chaque requête métier passe par `requireBusiness()` : impossible d'accéder
   aux données d'un autre business (filtre `businessId` systématique).
4. Validation Zod sur toutes les entrées ; `total` et `paymentStatus` sont
   recalculés côté serveur, jamais acceptés du client.
5. Aucune clé API dans le frontend ; secrets via variables d'environnement.

## Modèle de données

```
User 1 ── 1 Business 1 ──── * Customer
                     1 ──── * Sale (customerId nullable)
                     1 ──── * Expense
```

## Calculs (backend uniquement)

- Chiffre d'affaires = SUM(sales.total)
- Dépenses = SUM(expenses.amount)
- Bénéfice simplifié = CA − dépenses
- À recevoir = SUM(sales.total − sales.paidAmount)
- total = quantity × unitPrice (recalculé serveur)

## Extension future

- Plans FREE / PRO / BUSINESS : champ `plan` déjà en base.
- Nouveau fournisseur IA : implémenter `AIProvider` et l'ajouter à `AIService`.
- i18n : libellés centralisés, formats via `Intl` (fr-FR par défaut).

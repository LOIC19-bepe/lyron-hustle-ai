import Link from "next/link";
import {
  AssistantVisual,
  DashboardVisual,
  FeatureIllustration,
  MarketReachVisual,
} from "@/components/landing-visuals";
import { PLAN_CATALOG } from "@/lib/billing-plans";

const FEATURES = [
  { icon: "🛒", kind: "sales", title: "Suivi des ventes", desc: "Enregistre chaque vente en quelques secondes, même depuis ton téléphone." },
  { icon: "💸", kind: "expenses", title: "Contrôle des dépenses", desc: "Sache exactement où part ton argent, catégorie par catégorie." },
  { icon: "👥", kind: "customers", title: "Gestion des clients", desc: "Historique d'achats, totaux payés et dettes de chaque client." },
  { icon: "⏳", kind: "debts", title: "Dettes clients", desc: "Vois qui te doit de l'argent et combien, en un coup d'œil." },
  { icon: "📈", kind: "reports", title: "Rapports simples", desc: "Aujourd'hui, 7 jours, 30 jours ou période personnalisée." },
  { icon: "🤖", kind: "assistant", title: "Assistant IA", desc: "Pose tes questions en langage simple, reçois des réponses claires." },
];

const FAQ = [
  { q: "Est-ce que c'est vraiment gratuit ?", a: "Oui. Le plan FREE te permet de gérer tes ventes, dépenses et clients sans limite de durée, sans carte bancaire." },
  { q: "Faut-il connaître la comptabilité ?", a: "Non. LYRON HUSTLE AI est conçu pour les entrepreneurs, pas pour les comptables. Tout est expliqué simplement." },
  { q: "L'IA peut-elle se tromper sur mes chiffres ?", a: "Non. Tous les calculs sont faits par notre serveur à partir de tes données réelles. L'IA ne fait qu'expliquer les résultats — elle n'invente jamais de chiffres." },
  { q: "Quelles devises sont supportées ?", a: "XAF, XOF, USD, EUR, GBP, NGN, GHS, KES et plus encore. Tu choisis ta devise à la création de ton entreprise." },
  { q: "Ça marche sur mobile ?", a: "Oui, l'application est pensée mobile-first : tu peux tout gérer depuis ton smartphone." },
];

const PLAN_ORDER = ["FREE", "STARTER", "BUSINESS", "PRO"] as const;

export default function LandingPage() {
  return (
    <div className="bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">L</div>
            <span className="text-sm font-bold sm:text-base">LYRON HUSTLE AI</span>
          </div>
          <nav className="flex items-center gap-1.5 sm:gap-3">
            <div className="hidden items-center gap-5 lg:flex">
              <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900">Fonctionnalités</Link>
              <Link href="#solutions" className="text-sm font-medium text-slate-600 hover:text-slate-900">Solutions</Link>
              <Link href="#tarifs" className="text-sm font-medium text-slate-600 hover:text-slate-900">Tarifs</Link>
              <Link href="#about" className="text-sm font-medium text-slate-600 hover:text-slate-900">À propos</Link>
            </div>
            <Link href="/login" className="rounded-xl px-2 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 sm:px-3 sm:text-sm">
              Se connecter
            </Link>
            <Link href="/register" className="rounded-xl bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 sm:px-4 sm:text-sm">
              Commencer gratuitement
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-white" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div className="text-center lg:text-left">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
              🚀 Le copilote intelligent des entrepreneurs africains.
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl xl:text-6xl">
              Ton business. Tes chiffres. <span className="text-blue-600">Tes décisions.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 lg:mx-0">
              <span className="font-semibold text-slate-800">Le copilote intelligent des entrepreneurs africains.</span>{" "}
              Comprends tes ventes, tes dépenses et tes bénéfices pour décider avec plus de clarté.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/register" className="w-full rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 sm:w-auto">
                Commencer gratuitement
              </Link>
              <Link href="#features" className="w-full rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto">
                Découvrir la plateforme
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">Démonstration visuelle · données fictives</p>
          </div>
          <DashboardVisual />
        </div>
      </section>

      {/* Problème */}
      <section id="solutions" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">Tu vends tous les jours… mais sais-tu vraiment combien tu gagnes ?</h2>
            <ul className="mt-6 space-y-3 text-slate-600">
              <li>❌ Les ventes notées dans un cahier ou sur WhatsApp</li>
              <li>❌ Des clients qui doivent de l&apos;argent… mais combien ?</li>
              <li>❌ Des dépenses oubliées qui mangent le bénéfice</li>
              <li>❌ Des outils de gestion trop compliqués, faits pour les comptables</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-slate-900 p-8 text-white">
            <h3 className="text-xl font-bold">✅ La solution</h3>
            <p className="mt-3 text-slate-300">
              LYRON HUSTLE AI enregistre tes ventes, dépenses et clients,
              calcule automatiquement ton chiffre d&apos;affaires, ton bénéfice et
              tes dettes clients — puis une IA t&apos;explique tout, simplement,
              comme un ami qui s&apos;y connaît.
            </p>
            <div className="mt-5 rounded-xl bg-slate-800 p-4 text-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-300">Exemple illustratif · données fictives</p>
              <p className="text-slate-400">Toi :</p>
              <p className="mt-1 font-medium">« Combien ai-je gagné ce mois-ci ? »</p>
              <p className="mt-3 text-slate-400">LYRON HUSTLE AI :</p>
              <p className="mt-1 font-medium text-green-400">
                « Ce mois-ci, tu as encaissé 125 000 en ventes, dépensé 77 500,
                soit un bénéfice de 47 500. 📈 En hausse de 12% ! »
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="features" className="scroll-mt-24 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">Tout ce qu&apos;il faut, rien de superflu</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Pensé pour les commerçants, vendeurs en ligne et indépendants qui travaillent depuis leur smartphone.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl">{f.icon}</div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 min-h-10 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                <FeatureIllustration kind={f.kind} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard + IA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <AssistantVisual />
          <div>
            <h2 className="text-3xl font-bold">Un dashboard clair + une IA qui parle ton langage</h2>
            <ul className="mt-6 space-y-3 text-slate-600">
              <li>📊 Tes chiffres essentiels en un coup d&apos;œil</li>
              <li>📈 L&apos;évolution ventes / dépenses / bénéfices</li>
              <li>🤖 Des recommandations concrètes basées sur tes vraies données</li>
              <li>🔒 Les calculs sont faits par nos serveurs — l&apos;IA n&apos;invente jamais de chiffres</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section id="about" className="scroll-mt-24 bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">Pensé pour les entrepreneurs africains</h2>
          <MarketReachVisual />
        </div>
      </section>

      {/* Tarification */}
      <section id="tarifs" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Une tarification simple</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map((planCode) => {
            const plan = PLAN_CATALOG[planCode];
            return (
              <div key={planCode} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{plan.name}</p>
                <p className="mt-3 text-2xl font-extrabold text-slate-950">
                  {new Intl.NumberFormat("fr-FR").format(plan.monthlyPrice)} <span className="text-xs font-semibold text-slate-500">FCFA / mois</span>
                </p>
                <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                  {new Intl.NumberFormat("fr-FR").format(plan.monthlyCredits)} crédits IA / mois
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-xs leading-relaxed text-slate-600">
                  {plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
                </ul>
                <Link href={`/checkout?plan=${planCode}&interval=monthly`} className="mt-5 block rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-700">
                  Choisir ce plan
                </Link>
              </div>
            );
          })}
        </div>
        <div className="mt-7 text-center">
          <Link href="/pricing" className="text-sm font-semibold text-blue-700 hover:underline">Comparer les forfaits mensuels et annuels →</Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">Questions fréquentes</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer list-none font-semibold text-slate-900">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Prends le contrôle de ton business dès aujourd&apos;hui
        </h2>
        <p className="mt-4 text-slate-600">
          Rejoins les entrepreneurs qui pilotent leur activité avec des chiffres clairs.
        </p>
        <Link href="/register" className="mt-8 inline-block rounded-xl bg-blue-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700">
          Commencer gratuitement
        </Link>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} LYRON HUSTLE AI — Ton business. Tes chiffres. Tes décisions.
      </footer>
    </div>
  );
}

const BAR_HEIGHTS = [30, 48, 38, 68, 52, 82, 63, 94, 74, 100, 78, 112];

export function DashboardVisual() {
  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-950/10">
      <div className="flex min-h-[330px]">
        <aside className="hidden w-36 shrink-0 flex-col bg-slate-950 p-4 text-white sm:flex">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wide">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500 text-xs">L</span>
            LYRON HUSTLE
          </div>
          <div className="mt-8 space-y-2.5 text-[10px] text-slate-300">
            <p className="rounded-md bg-blue-500/20 px-2 py-1.5 text-blue-200">▦ Tableau de bord</p>
            <p className="px-2 py-1">↗ Ventes</p>
            <p className="px-2 py-1">↘ Dépenses</p>
            <p className="px-2 py-1">◷ Rapports</p>
          </div>
          <div className="mt-auto rounded-lg border border-slate-700 p-2 text-[9px] text-slate-400">
            Espace démo
            <span className="mt-1 block text-white">Mon activité</span>
          </div>
        </aside>
        <div className="min-w-0 flex-1 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-blue-700">Maquette · données fictives</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900 sm:text-base">Vue d&apos;ensemble</h3>
            </div>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] text-slate-500">30 derniers jours</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { label: "CHIFFRE D’AFFAIRES", value: "842 500", color: "text-blue-700" },
              { label: "BÉNÉFICE", value: "286 200", color: "text-emerald-700" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-2.5">
                <p className="text-[8px] font-semibold text-slate-400">{stat.label}</p>
                <p className={`mt-1 text-sm font-bold ${stat.color}`}>{stat.value} <span className="text-[8px] font-medium">XAF</span></p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-800">Activité des ventes</p>
              <p className="text-[9px] text-slate-400">Exemple illustratif</p>
            </div>
            <div className="mt-3 flex h-24 items-end gap-1.5 border-b border-slate-100 px-1">
              {BAR_HEIGHTS.map((height, index) => (
                <div
                  key={index}
                  className={`flex-1 rounded-t-sm ${index > 8 ? "bg-blue-600" : "bg-blue-200"}`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[8px] text-slate-400">
              <span>Début de période</span>
              <span>Fin de période</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-[9px] text-slate-700">
            <span>🤖 Analyse disponible</span>
            <span className="font-semibold text-blue-700">Voir les tendances →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURE_BARS = [35, 64, 44, 78, 56, 92];

export function FeatureIllustration({ kind }: { kind: string }) {
  if (kind === "assistant") {
    return (
      <div aria-hidden className="mt-5 flex h-20 flex-col justify-center gap-2 rounded-lg bg-blue-50 p-3">
        <div className="w-3/4 rounded-md bg-white px-2 py-1 text-[9px] text-slate-500 shadow-sm">Analyse mes ventes.</div>
        <div className="ml-auto w-4/5 rounded-md bg-blue-600 px-2 py-1 text-[9px] text-white">Voici les tendances de ton activité…</div>
      </div>
    );
  }

  return (
    <div aria-hidden className="mt-5 flex h-20 items-end gap-2 rounded-lg bg-slate-50 px-3 py-3">
      {FEATURE_BARS.map((height, index) => (
        <div
          key={`${kind}-${index}`}
          className={`flex-1 rounded-t-sm ${index === FEATURE_BARS.length - 1 ? "bg-blue-600" : "bg-blue-200"}`}
          style={{ height: `${height}%` }}
        />
      ))}
      <div className="ml-2 flex h-full flex-1 flex-col justify-between py-1">
        <span className="h-1.5 w-full rounded bg-slate-200" />
        <span className="h-1.5 w-4/5 rounded bg-slate-200" />
        <span className="h-1.5 w-3/5 rounded bg-slate-200" />
      </div>
    </div>
  );
}

export function AssistantVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-blue-950/10">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm text-white">✦</span>
          <div>
            <p className="text-xs font-semibold text-slate-900">Assistant LYRON</p>
            <p className="text-[10px] text-slate-500">Analyse de démonstration</p>
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700">APERÇU</span>
      </div>
      <div className="space-y-3 bg-slate-50 p-4 sm:p-5">
        <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-blue-600 px-3 py-2 text-xs text-white">
          Pourquoi mon bénéfice diminue ?
        </div>
        <div className="max-w-[92%] rounded-xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-slate-700">
          Comparons tes ventes et tes dépenses sur la période sélectionnée. Je m&apos;appuie sur les chiffres enregistrés dans ton espace.
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-[10px] text-slate-500">
          <span className="text-blue-600">✦</span>
          Les réponses s&apos;appuient sur les données disponibles.
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 p-3">
        <div className="h-8 flex-1 rounded-lg border border-slate-200 bg-slate-50" />
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs text-white">↑</div>
      </div>
    </div>
  );
}

export function MarketReachVisual() {
  const phases = ["Cameroun", "Afrique francophone", "Afrique", "International"];

  return (
    <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-4">
        {phases.map((phase, index) => (
          <div key={phase} className="relative flex items-center gap-3 sm:flex-col sm:items-start">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700">
              0{index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{phase}</p>
              <p className="mt-0.5 text-xs text-slate-500">Phase {index + 1}</p>
            </div>
            {index < phases.length - 1 && <span aria-hidden className="absolute left-4 top-9 h-4 w-px bg-blue-200 sm:left-11 sm:top-4 sm:h-px sm:w-[calc(100%-2rem)]" />}
          </div>
        ))}
      </div>
    </div>
  );
}

import type { AIProvider, BusinessSnapshot } from "@/server/ai/types";

const NOT_ENOUGH_DATA =
  "Je n'ai pas suffisamment de données pour répondre précisément. Ajoute quelques ventes et dépenses, puis repose ta question. 📊";

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "XAF" || currency === "XOF" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString("fr-FR")} ${currency}`;
  }
}

function pctChange(current: number, previous: number): string | null {
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

/**
 * Deterministic analyst: interprets backend-computed figures only.
 * Used as default provider and as fallback when no LLM key is configured.
 */
export class RuleBasedProvider implements AIProvider {
  readonly name = "rule-based";

  async answer(question: string, s: BusinessSnapshot): Promise<string> {
    const q = question.toLowerCase();
    const hasData = s.allTime.salesCount > 0 || s.allTime.expensesTotal > 0;
    if (!hasData) return NOT_ENOUGH_DATA;

    if (/(compar|semaine derni|week)/.test(q)) {
      return this.compareWeeks(s);
    }
    if (/(doivent|dette|impay|recevoir|créance|creance)/.test(q)) {
      return this.debts(s);
    }
    if (/(meilleur|top).*(client)|client.*(fidèle|fidele|important)/.test(q)) {
      return this.topCustomers(s);
    }
    if (/(dépense|depense|où.*dépens|ou.*depens|coût|cout|charge)/.test(q)) {
      return this.expenses(s);
    }
    if (/(améliorer|ameliorer|conseil|augmenter|recommand|optimis)/.test(q)) {
      return this.recommendations(s);
    }
    if (/(gagné|gagne|bénéfice|benefice|profit|mois|revenu|chiffre)/.test(q)) {
      return this.earnings(s);
    }
    return this.overview(s);
  }

  private earnings(s: BusinessSnapshot): string {
    const m = s.last30Days;
    const c = s.currency;
    const lines = [
      `Sur les 30 derniers jours :`,
      `• Chiffre d'affaires : **${fmt(m.revenue, c)}** (${m.salesCount} vente${m.salesCount > 1 ? "s" : ""})`,
      `• Dépenses : **${fmt(m.expensesTotal, c)}**`,
      `• Bénéfice simplifié : **${fmt(m.profit, c)}**`,
    ];
    if (m.profit < 0) {
      lines.push(
        `⚠️ Tes dépenses dépassent tes ventes sur cette période. Vérifie tes plus grosses catégories de dépenses.`
      );
    } else if (m.revenue > 0) {
      const margin = (m.profit / m.revenue) * 100;
      lines.push(`Ta marge est d'environ ${margin.toFixed(0)}%.`);
    }
    return lines.join("\n");
  }

  private compareWeeks(s: BusinessSnapshot): string {
    const cur = s.last7Days;
    const prev = s.previous7Days;
    const c = s.currency;
    if (cur.salesCount === 0 && prev.salesCount === 0) return NOT_ENOUGH_DATA;
    const change = pctChange(cur.revenue, prev.revenue);
    const trend =
      cur.revenue > prev.revenue
        ? "📈 En hausse"
        : cur.revenue < prev.revenue
          ? "📉 En baisse"
          : "➡️ Stable";
    return [
      `Comparaison des 7 derniers jours avec la semaine précédente :`,
      `• Cette semaine : **${fmt(cur.revenue, c)}** (${cur.salesCount} ventes)`,
      `• Semaine précédente : **${fmt(prev.revenue, c)}** (${prev.salesCount} ventes)`,
      `• Tendance : ${trend}${change ? ` (${change})` : ""}`,
      cur.revenue < prev.revenue
        ? `Pense à relancer tes clients récents ou à mettre en avant tes produits qui se vendent le mieux.`
        : `Continue sur cette lancée 💪`,
    ].join("\n");
  }

  private debts(s: BusinessSnapshot): string {
    const c = s.currency;
    if (s.allTime.unpaid <= 0) {
      return `Bonne nouvelle 🎉 Aucun client ne te doit d'argent actuellement. Total à recevoir : ${fmt(0, c)}.`;
    }
    const lines = [
      `Montant total à recevoir : **${fmt(s.allTime.unpaid, c)}**.`,
    ];
    if (s.debtors.length > 0) {
      lines.push(`Clients avec une dette :`);
      for (const d of s.debtors) {
        lines.push(`• ${d.name} : ${fmt(d.debt, c)}`);
      }
      lines.push(
        `💡 Conseil : relance d'abord ${s.debtors[0].name}, c'est la dette la plus importante.`
      );
    } else {
      lines.push(
        `Ces montants proviennent de ventes sans client associé. Associe tes ventes à des clients pour suivre les dettes précisément.`
      );
    }
    return lines.join("\n");
  }

  private topCustomers(s: BusinessSnapshot): string {
    const c = s.currency;
    const top = s.topCustomers.filter((t) => t.totalPurchased > 0);
    if (top.length === 0) {
      return `Aucune vente n'est encore associée à un client. Ajoute le client au moment d'enregistrer une vente pour suivre tes meilleurs clients.`;
    }
    const lines = [`Tes meilleurs clients (total acheté) :`];
    top.forEach((t, i) => {
      lines.push(
        `${i + 1}. ${t.name} — ${fmt(t.totalPurchased, c)} (${t.salesCount} achats)${t.debt > 0 ? ` · doit encore ${fmt(t.debt, c)}` : ""}`
      );
    });
    lines.push(`💡 Chouchoute ces clients : ils font vivre ton business.`);
    return lines.join("\n");
  }

  private expenses(s: BusinessSnapshot): string {
    const c = s.currency;
    if (s.expenseCategories.length === 0) {
      return `Tu n'as encore enregistré aucune dépense. Ajoute tes dépenses pour que je puisse analyser où part ton argent.`;
    }
    const total = s.allTime.expensesTotal;
    const lines = [`Répartition de tes dépenses :`];
    for (const cat of s.expenseCategories) {
      const pct = total > 0 ? ((cat.amount / total) * 100).toFixed(0) : "0";
      lines.push(`• ${cat.category} : ${fmt(cat.amount, c)} (${pct}%)`);
    }
    const biggest = s.expenseCategories[0];
    lines.push(
      `💡 Ton poste principal est « ${biggest.category} ». C'est là qu'une optimisation aura le plus d'impact.`
    );
    return lines.join("\n");
  }

  private recommendations(s: BusinessSnapshot): string {
    const c = s.currency;
    const tips: string[] = [];
    if (s.allTime.unpaid > 0) {
      tips.push(
        `• Récupère tes impayés : **${fmt(s.allTime.unpaid, c)}** à recevoir. C'est de l'argent déjà gagné.`
      );
    }
    if (s.expenseCategories.length > 0) {
      tips.push(
        `• Réduis ton poste « ${s.expenseCategories[0].category} » (${fmt(s.expenseCategories[0].amount, c)}), ton plus gros poste de dépense.`
      );
    }
    if (s.topCustomers.length > 0 && s.topCustomers[0].totalPurchased > 0) {
      tips.push(
        `• Fidélise ${s.topCustomers[0].name}, ton meilleur client, et propose-lui des offres dédiées.`
      );
    }
    const cur = s.last7Days.revenue;
    const prev = s.previous7Days.revenue;
    if (prev > 0 && cur < prev) {
      tips.push(
        `• Tes ventes baissent cette semaine (${fmt(cur, c)} vs ${fmt(prev, c)}). Relance tes clients récents.`
      );
    }
    if (tips.length === 0) return NOT_ENOUGH_DATA;
    return [`Voici comment améliorer ton bénéfice :`, ...tips].join("\n");
  }

  private overview(s: BusinessSnapshot): string {
    const m = s.last30Days;
    const c = s.currency;
    const trendTxt =
      s.last7Days.revenue >= s.previous7Days.revenue
        ? "📈 tes ventes progressent cette semaine"
        : "📉 tes ventes ralentissent cette semaine";
    return [
      `Vue d'ensemble de ${s.businessName} (30 derniers jours) :`,
      `• Chiffre d'affaires : **${fmt(m.revenue, c)}**`,
      `• Dépenses : **${fmt(m.expensesTotal, c)}**`,
      `• Bénéfice : **${fmt(m.profit, c)}**`,
      `• À recevoir : **${fmt(s.allTime.unpaid, c)}**`,
      `• ${m.salesCount} ventes · ${m.customersCount} clients`,
      ``,
      `Tendance : ${trendTxt}.`,
      `Tu peux me demander par exemple : « Quels clients me doivent de l'argent ? » ou « Où est-ce que je dépense le plus ? »`,
    ].join("\n");
  }
}

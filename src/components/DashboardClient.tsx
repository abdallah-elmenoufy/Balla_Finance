"use client";

import { useState } from "react";
import type {
  AccountWithBalance,
  AnalyticsData,
  Category,
  CreditCardStatus,
  Currency,
  OverallDebtSummary,
  Person,
  PersonDebtSummary,
} from "@/lib/types";
import QuickActionToolbar, { type QuickPayTarget } from "./QuickActionToolbar";
import DebtJourneyCard from "./DebtJourneyCard";
import CreditCardsWatchlist from "./CreditCardsWatchlist";
import AnalyticsCharts from "./AnalyticsCharts";
import CelebrationToast from "./CelebrationToast";

export default function DashboardClient({
  overallDebt,
  personDebts,
  creditCards,
  accounts,
  people,
  categories,
  currencies,
  dataByPeriod,
}: {
  overallDebt: OverallDebtSummary;
  personDebts: PersonDebtSummary[];
  creditCards: CreditCardStatus[];
  accounts: AccountWithBalance[];
  people: Person[];
  categories: Category[];
  currencies: Currency[];
  dataByPeriod: {
    week: AnalyticsData;
    month: AnalyticsData;
    year: AnalyticsData;
    all: AnalyticsData;
  };
}) {
  const [quickPayTarget, setQuickPayTarget] = useState<QuickPayTarget | null>(null);

  function handleQuickPayPerson(personId: number, personName: string, remainingAmount: number) {
    setQuickPayTarget({
      type: "person",
      id: personId,
      name: personName,
      amount: remainingAmount,
    });
  }

  function handleQuickPayCard(cardId: number, cardName: string, owedAmount: number) {
    setQuickPayTarget({
      type: "card",
      id: cardId,
      name: cardName,
      amount: owedAmount,
    });
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Toast celebration feedback on successful payments */}
      <CelebrationToast />

      {/* Quick Action One-Click Bar */}
      <QuickActionToolbar
        accounts={accounts}
        people={people}
        personDebts={personDebts}
        creditCards={creditCards}
        categories={categories}
        currencies={currencies}
        externalTrigger={quickPayTarget}
      />

      {/* Hero Section: Debt Repayment Journey (الأمانات والديون العائلية) */}
      <DebtJourneyCard
        overallDebt={overallDebt}
        personDebts={personDebts}
        onQuickPayPerson={handleQuickPayPerson}
      />

      {/* Credit Card Penalty Prevention Hub (حماية البطاقات من الغرامات) */}
      <CreditCardsWatchlist
        cards={creditCards}
        onQuickPayCard={handleQuickPayCard}
      />

      {/* Integrated Analytics & Graphs (Week / Month / Year) */}
      <AnalyticsCharts dataByPeriod={dataByPeriod} />
    </div>
  );
}

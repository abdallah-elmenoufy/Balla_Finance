"use client";

import { useState } from "react";
import type {
  AccountWithBalance,
  AnalyticsData,
  Category,
  CreditCardStatus,
  Currency,
  OverallDebtSummary,
  OverallReceivableSummary,
  Person,
  PersonDebtSummary,
  PersonReceivableSummary,
} from "@/lib/types";
import QuickActionToolbar, { type QuickPayTarget } from "./QuickActionToolbar";
import DebtJourneyCard from "./DebtJourneyCard";
import ReceivablesHub from "./ReceivablesHub";
import CreditCardsWatchlist from "./CreditCardsWatchlist";
import AnalyticsCharts from "./AnalyticsCharts";
import CelebrationToast from "./CelebrationToast";

export default function DashboardClient({
  overallDebt,
  overallDebts,
  personDebts,
  receivables = [],
  overallReceivables = [],
  creditCards,
  accounts,
  people,
  categories,
  currencies,
  dataByPeriod,
}: {
  overallDebt: OverallDebtSummary;
  overallDebts?: OverallDebtSummary[];
  personDebts: PersonDebtSummary[];
  receivables?: PersonReceivableSummary[];
  overallReceivables?: OverallReceivableSummary[];
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

  function handleQuickPayPerson(
    personId: number,
    personName: string,
    remainingAmount: number,
    currency?: string
  ) {
    setQuickPayTarget({
      type: "person",
      id: personId,
      name: personName,
      amount: remainingAmount,
      currency,
    });
  }

  function handleQuickCollectPerson(
    personId: number,
    personName: string,
    remainingAmount: number,
    currency?: string
  ) {
    setQuickPayTarget({
      type: "collect",
      id: personId,
      name: personName,
      amount: remainingAmount,
      currency,
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
        receivables={receivables}
        creditCards={creditCards}
        categories={categories}
        currencies={currencies}
        externalTrigger={quickPayTarget}
      />

      {/* Hero Section: Debt Repayment Journey (الأمانات والديون العائلية) */}
      <DebtJourneyCard
        overallDebt={overallDebt}
        overallDebts={overallDebts}
        personDebts={personDebts}
        onQuickPayPerson={handleQuickPayPerson}
      />

      {/* Receivables Section: Money Owed to User by Others (أموال مستحقة لك بالخارج) */}
      <ReceivablesHub
        receivables={receivables}
        overallReceivables={overallReceivables}
        onQuickCollectPerson={handleQuickCollectPerson}
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

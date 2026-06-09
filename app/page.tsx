'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFinance } from '@/lib/store'

const statuses = ['angestellt', 'selbstständig', 'freelancer', 'kleinunternehmer']

function formatEuro(value: number) {
  return value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

export default function DashboardPage() {
  const {
    summary,
    userStatus,
    setUserStatus,
    milaFeedback,
    expenses,
    incomes,
    userName,
    budgetStatus,
    addExpense,
    addIncome,
  } = useFinance()

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf9ff] p-6">
        <p className="animate-pulse text-sm font-bold text-violet-700">
          Mila lädt deine Daten...
        </p>
      </main>
    )
  }

  const addDemoExpense = () => {
    addExpense({
      title: 'Canva Pro',
      vendor: 'Canva',
      amount: 14.99,
      category: 'Software',
      date: new Date().toISOString(),
    })
  }

  const addDemoIncome = () => {
    addIncome({
      title: 'Kundenprojekt',
      client: 'Demo Kundin',
      amount: 450,
      date: new Date().toISOString(),
    })
  }

  return (
    <main className="min-h-screen space-y-6 bg-[#fbf9ff] p-4 text-slate-950">
      <section className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Hallo {userName || 'Julia'} 👋
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-violet-500">
            Dein Finanz-Überblick
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white text-xl shadow-sm">
          ✨
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Steuerlicher Status
          </h2>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black text-violet-700">
            Live
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setUserStatus(status as any)}
              className={
                userStatus === status
                  ? 'rounded-2xl bg-violet-600 px-3 py-3 text-[10px] font-black uppercase tracking-tight text-white shadow-sm'
                  : 'rounded-2xl bg-violet-50 px-3 py-3 text-[10px] font-black uppercase tracking-tight text-violet-700'

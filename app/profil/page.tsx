"use client"

import { useFinance } from "../../lib/store"

export default function ProfilPage() {
  const {
    userName,
    setUserName,
    userStatus,
    setUserStatus,
    taxRate,
    setTaxRate,
  } = useFinance()

  // Automatische Steuerlogik
  const handleStatusChange = (value: string) => {
    setUserStatus(value as any)

    switch (value) {
      case "freelancer":
        setTaxRate(30) // Beispielwert
        break
      case "kleinunternehmer":
        setTaxRate(25) // Einkommensteuer normal, aber keine USt
        break
      case "minijob":
        setTaxRate(0) // Arbeitnehmer zahlt keine Einkommensteuer
        break
      case "selbstständig":
        setTaxRate(30)
        break
      case "angestellt":
        setTaxRate(20)
        break
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Profil</h1>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">

        <div>
          <label className="text-sm font-medium">Name</label>
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full mt-1 p-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Status</label>

          <select
            value={userStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full mt-1 p-2 border rounded-lg"
          >
            <option value="selbstständig">Selbstständig</option>
            <option value="angestellt">Angestellt</option>
            <option value="freelancer">Freelancer</option>
            <option value="kleinunternehmer">Kleinunternehmer (§19)</option>
            <option value="minijob">Minijob</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Steuersatz (%)</label>

          <input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="w-full mt-1 p-2 border rounded-lg"
          />
        </div>

      </div>
    </div>
  )
}

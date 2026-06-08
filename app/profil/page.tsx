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

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">
        Profil
      </h1>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">

        <div>
          <label className="text-sm font-medium">
            Name
          </label>
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full mt-1 p-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Status
          </label>

          <select
            value={userStatus}
            onChange={(e) =>
              setUserStatus(
                e.target.value as "angestellt" | "selbstständig"
              )
            }
            className="w-full mt-1 p-2 border rounded-lg"
          >
            <option value="selbstständig">
              Selbstständig
            </option>

            <option value="angestellt">
              Angestellt
            </option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">
            Steuersatz (%)
          </label>

          <input
            type="number"
            value={taxRate}
            onChange={(e) =>
              setTaxRate(Number(e.target.value))
            }
            className="w-full mt-1 p-2 border rounded-lg"
          />
        </div>

      </div>
    </div>
  )
}

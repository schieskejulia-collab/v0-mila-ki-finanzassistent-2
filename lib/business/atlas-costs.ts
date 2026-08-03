export type AtlasEmployeeCostInput = {
  monthlyGross: number
  employerCostPercent: number
  annualVacationDays: number
  annualSickDays: number
  annualBadWeatherDays: number
  annualProductiveHours: number
}

export type AtlasEmployeeCostResult = {
  monthlyGross: number
  monthlyEmployerCosts: number
  monthlyAbsenceReserve: number
  monthlyTotalCost: number
  productiveHourlyCost: number
}

function money(value: number) {
  return Math.round(Math.max(0, value) * 100) / 100
}

export function calculateAtlasEmployeeCost(
  input: AtlasEmployeeCostInput
): AtlasEmployeeCostResult {
  const monthlyGross = Math.max(0, Number(input.monthlyGross) || 0)
  const employerCostPercent = Math.max(
    0,
    Number(input.employerCostPercent) || 0
  )
  const annualVacationDays = Math.max(
    0,
    Number(input.annualVacationDays) || 0
  )
  const annualSickDays = Math.max(0, Number(input.annualSickDays) || 0)
  const annualBadWeatherDays = Math.max(
    0,
    Number(input.annualBadWeatherDays) || 0
  )
  const annualProductiveHours = Math.max(
    1,
    Number(input.annualProductiveHours) || 1
  )

  const monthlyEmployerCosts =
    monthlyGross * (employerCostPercent / 100)

  const annualAbsenceDays =
    annualVacationDays +
    annualSickDays +
    annualBadWeatherDays

  const annualAbsenceReserve =
    monthlyGross * 12 * (annualAbsenceDays / 260)

  const monthlyAbsenceReserve =
    annualAbsenceReserve / 12

  const monthlyTotalCost =
    monthlyGross +
    monthlyEmployerCosts +
    monthlyAbsenceReserve

  const annualTotalCost =
    monthlyTotalCost * 12

  const productiveHourlyCost =
    annualTotalCost / annualProductiveHours

  return {
    monthlyGross: money(monthlyGross),
    monthlyEmployerCosts: money(monthlyEmployerCosts),
    monthlyAbsenceReserve: money(monthlyAbsenceReserve),
    monthlyTotalCost: money(monthlyTotalCost),
    productiveHourlyCost: money(productiveHourlyCost),
  }
}
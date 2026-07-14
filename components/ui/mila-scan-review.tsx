'use client'

type MilaScanReviewProps = {
  suggestion: string
  confidence: number | null
  needsConfirmation: boolean
  reviewReason: string
  alternatives: string[]
  category: string
  taxStatus: string
  taxHint: number
  deductible: boolean
  onSelectCategory: (option: string) => void
}

function getConfidencePercent(
  confidence: number | null
) {
  if (
    confidence === null ||
    !Number.isFinite(confidence)
  ) {
    return null
  }

  const percent =
    confidence <= 1
      ? confidence * 100
      : confidence

  return Math.max(
    0,
    Math.min(100, Math.round(percent))
  )
}

function formatEuro(value: number) {
  return Number(value || 0).toLocaleString(
    'de-DE',
    {
      style: 'currency',
      currency: 'EUR',
    }
  )
}

export function MilaScanReview({
  suggestion,
  confidence,
  needsConfirmation,
  reviewReason,
  alternatives,
  category,
  taxStatus,
  taxHint,
  deductible,
  onSelectCategory,
}: MilaScanReviewProps) {
  if (!suggestion) {
    return null
  }

  const confidencePercent =
    getConfidencePercent(confidence)

  return (
    <section className="rounded-[2rem] bg-violet-50 p-5 text-sm text-slate-700">
      <p className="font-black text-violet-700">
        {needsConfirmation
          ? '🧠 Mila denkt nach'
          : '✨ Mila Einschätzung'}
      </p>

      <div className="mt-3 space-y-2">
        <p>
          Meine Vermutung:{' '}
          <strong>{suggestion}</strong>
        </p>

        {confidencePercent !== null && (
          <p>
            Sicherheit:{' '}
            <strong>
              {confidencePercent} %
            </strong>
          </p>
        )}

        {reviewReason && (
          <p className="leading-relaxed">
            {reviewReason}
          </p>
        )}
      </div>

      {needsConfirmation &&
      alternatives.length > 0 ? (
        <div className="mt-4">
          <p className="mb-3 font-black text-slate-800">
            Was passt wirklich?
          </p>

          <div className="grid gap-2">
            {alternatives.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  onSelectCategory(option)
                }
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-left font-bold text-slate-800 active:scale-[0.99]"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!needsConfirmation && category && (
        <div className="mt-4 rounded-2xl bg-white px-4 py-3">
          <p>
            Kategorie übernommen:{' '}
            <strong className="text-violet-700">
              {category}
            </strong>
          </p>

          <p className="mt-1">
            Steuerlich:{' '}
            <strong>{taxStatus}</strong>
          </p>

          {deductible && (
            <p className="mt-1">
              Geschätzte Steuerwirkung bei
              30 %:{' '}
              <strong>
                {formatEuro(taxHint)}
              </strong>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
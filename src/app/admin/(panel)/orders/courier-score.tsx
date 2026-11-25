import { riskyScore } from '@/modules/fraud'

type Score = { total: number; delivered: number; pct: number | null }

/** D2: a phone's courier record, as one short line. */
export const CourierScore = ({
  score,
  t,
}: {
  score: Score
  t: (k: string, v?: Record<string, string | number>) => string
}) => (
  <span
    data-testid="courier-score"
    data-risky={riskyScore(score.pct)}
    className="data-[risky=true]:font-semibold data-[risky=true]:text-danger"
  >
    {score.pct === null
      ? t('fraud.scoreNone')
      : t('fraud.scoreLine', { pct: score.pct, delivered: score.delivered, total: score.total })}
  </span>
)

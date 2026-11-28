const pad = (n: number) => String(n).padStart(2, '0')

/** H5: "Offer ends in 02:13:45", or the ended text once the time is up. */
export const countdownText = (ms: number, labels: { left: string; ended: string }) => {
  if (ms <= 0) return labels.ended
  const s = Math.floor(ms / 1000)
  return `${labels.left} ${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
}

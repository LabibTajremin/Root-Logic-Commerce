const DAY = 86_400_000

export const daysAgo = (days: number, now: Date = new Date()) =>
  new Date(now.getTime() - days * DAY)

/**
 * Keyframes for n rotating messages: each owns an equal slice of the cycle (4 s per
 * message), fading in, holding, then fading out before the next one starts.
 */
export const rotateKeyframes = (n: number) => {
  const slice = 100 / n
  const pct = (x: number) => `${+x.toFixed(2)}%`
  return `@keyframes rlc-rotate-${n}{0%{opacity:0;transform:translateY(40%)}${pct(slice * 0.1)},${pct(slice * 0.85)}{opacity:1;transform:none}${pct(slice)},100%{opacity:0}}`
}

// BD mobile: 01[3-9] + 8 digits. Accepts +880 / 880 / 0 prefixes, spaces and dashes.
export const normalizeBdPhone = (input: string) => {
  const digits = input.replace(/[\s-]/g, '').replace(/^\+?880/, '0')
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null
}

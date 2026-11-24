/** The 64 districts of Bangladesh: English (the stored key), Bangla, and older spellings. */
export const bdDistricts: { en: string; bn: string; aka?: string[] }[] = [
  { en: 'Bagerhat', bn: 'বাগেরহাট' },
  { en: 'Bandarban', bn: 'বান্দরবান' },
  { en: 'Barguna', bn: 'বরগুনা' },
  { en: 'Barishal', bn: 'বরিশাল', aka: ['Barisal'] },
  { en: 'Bhola', bn: 'ভোলা' },
  { en: 'Bogura', bn: 'বগুড়া', aka: ['Bogra'] },
  { en: 'Brahmanbaria', bn: 'ব্রাহ্মণবাড়িয়া' },
  { en: 'Chandpur', bn: 'চাঁদপুর' },
  { en: 'Chapainawabganj', bn: 'চাঁপাইনবাবগঞ্জ' },
  { en: 'Chattogram', bn: 'চট্টগ্রাম', aka: ['Chittagong', 'Ctg'] },
  { en: 'Chuadanga', bn: 'চুয়াডাঙ্গা' },
  { en: "Cox's Bazar", bn: 'কক্সবাজার', aka: ['Coxs Bazar', 'Cox Bazar'] },
  { en: 'Cumilla', bn: 'কুমিল্লা', aka: ['Comilla'] },
  { en: 'Dhaka', bn: 'ঢাকা' },
  { en: 'Dinajpur', bn: 'দিনাজপুর' },
  { en: 'Faridpur', bn: 'ফরিদপুর' },
  { en: 'Feni', bn: 'ফেনী' },
  { en: 'Gaibandha', bn: 'গাইবান্ধা' },
  { en: 'Gazipur', bn: 'গাজীপুর' },
  { en: 'Gopalganj', bn: 'গোপালগঞ্জ' },
  { en: 'Habiganj', bn: 'হবিগঞ্জ' },
  { en: 'Jamalpur', bn: 'জামালপুর' },
  { en: 'Jashore', bn: 'যশোর', aka: ['Jessore'] },
  { en: 'Jhalokati', bn: 'ঝালকাঠি' },
  { en: 'Jhenaidah', bn: 'ঝিনাইদহ' },
  { en: 'Joypurhat', bn: 'জয়পুরহাট' },
  { en: 'Khagrachhari', bn: 'খাগড়াছড়ি' },
  { en: 'Khulna', bn: 'খুলনা' },
  { en: 'Kishoreganj', bn: 'কিশোরগঞ্জ' },
  { en: 'Kurigram', bn: 'কুড়িগ্রাম' },
  { en: 'Kushtia', bn: 'কুষ্টিয়া' },
  { en: 'Lakshmipur', bn: 'লক্ষ্মীপুর' },
  { en: 'Lalmonirhat', bn: 'লালমনিরহাট' },
  { en: 'Madaripur', bn: 'মাদারীপুর' },
  { en: 'Magura', bn: 'মাগুরা' },
  { en: 'Manikganj', bn: 'মানিকগঞ্জ' },
  { en: 'Meherpur', bn: 'মেহেরপুর' },
  { en: 'Moulvibazar', bn: 'মৌলভীবাজার' },
  { en: 'Munshiganj', bn: 'মুন্সীগঞ্জ' },
  { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
  { en: 'Naogaon', bn: 'নওগাঁ' },
  { en: 'Narail', bn: 'নড়াইল' },
  { en: 'Narayanganj', bn: 'নারায়ণগঞ্জ' },
  { en: 'Narsingdi', bn: 'নরসিংদী' },
  { en: 'Natore', bn: 'নাটোর' },
  { en: 'Netrokona', bn: 'নেত্রকোণা' },
  { en: 'Nilphamari', bn: 'নীলফামারী' },
  { en: 'Noakhali', bn: 'নোয়াখালী' },
  { en: 'Pabna', bn: 'পাবনা' },
  { en: 'Panchagarh', bn: 'পঞ্চগড়' },
  { en: 'Patuakhali', bn: 'পটুয়াখালী' },
  { en: 'Pirojpur', bn: 'পিরোজপুর' },
  { en: 'Rajbari', bn: 'রাজবাড়ী' },
  { en: 'Rajshahi', bn: 'রাজশাহী' },
  { en: 'Rangamati', bn: 'রাঙ্গামাটি' },
  { en: 'Rangpur', bn: 'রংপুর' },
  { en: 'Satkhira', bn: 'সাতক্ষীরা' },
  { en: 'Shariatpur', bn: 'শরীয়তপুর' },
  { en: 'Sherpur', bn: 'শেরপুর' },
  { en: 'Sirajganj', bn: 'সিরাজগঞ্জ' },
  { en: 'Sunamganj', bn: 'সুনামগঞ্জ' },
  { en: 'Sylhet', bn: 'সিলেট' },
  { en: 'Tangail', bn: 'টাঙ্গাইল' },
  { en: 'Thakurgaon', bn: 'ঠাকুরগাঁও' },
]

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')
// Latin names match whole words ("Feni", not "Fenix"); Bangla ones match anywhere.
const patterns = bdDistricts.map((d) => ({
  en: d.en,
  re: new RegExp(
    `(?<![a-z])(?:${[d.en, ...(d.aka ?? [])].map(escape).join('|')})(?![a-z])|${d.bn}`,
    'gi',
  ),
}))

/** The district named in a typed address; the last one wins ("Mirpur, Dhaka"). */
export const detectDistrict = (text: string): string | null => {
  let best: { en: string; at: number } | null = null
  for (const p of patterns)
    for (const m of text.matchAll(p.re))
      if (!best || m.index > best.at) best = { en: p.en, at: m.index }
  return best?.en ?? null
}

export type AddressRule = {
  mode: 'text' | 'picker'
  /** District (English name) → delivery zone id. */
  districtZones: Record<string, string>
  /** Zone for any other district; '' = don't guess. */
  otherZone: string
}

/** C17: the zone a typed district/address points to, if the shop has one for it. */
export const detectZone = (text: string, rule: AddressRule, zoneIds: string[]): string | null => {
  const d = detectDistrict(text)
  if (!d) return null
  const z = rule.districtZones[d] ?? rule.otherZone
  return zoneIds.includes(z) ? z : null
}

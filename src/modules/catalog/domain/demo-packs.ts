/** J3: sample products per layout, so a new layout can be seen with fitting goods. */
type Demo = { name: string; price: number; description: string }

export const demoPacks: Record<'general' | 'fashion' | 'gadget' | 'grocery', Demo[]> = {
  general: [
    { name: 'Clay Water Jug', price: 45000, description: 'Keeps water cool on summer days.' },
    { name: 'Jute Tote Bag', price: 35000, description: 'Strong, washable, made in Bangladesh.' },
    { name: 'Nakshi Cushion Cover', price: 60000, description: 'Hand-stitched kantha work.' },
  ],
  fashion: [
    { name: 'Cotton Panjabi', price: 180000, description: 'Soft handloom cotton, sizes M–XXL.' },
    { name: 'Jamdani Saree', price: 650000, description: 'Woven by hand in Rupganj.' },
    {
      name: 'Printed Three-Piece',
      price: 240000,
      description: 'Lawn cotton with matching dupatta.',
    },
  ],
  gadget: [
    { name: 'Wireless Earbuds', price: 220000, description: '24-hour battery with the case.' },
    { name: 'Fast Charger 33W', price: 120000, description: 'Type-C, with a 1 m cable.' },
    { name: 'Power Bank 20000mAh', price: 280000, description: 'Charges two phones at once.' },
  ],
  grocery: [
    { name: 'Miniket Rice 5 kg', price: 42000, description: 'Clean, sorted, polished grain.' },
    { name: 'Mustard Oil 1 L', price: 30000, description: 'Cold-pressed, strong aroma.' },
    { name: 'Sundarban Honey 500 g', price: 65000, description: 'Raw mangrove honey.' },
  ],
}

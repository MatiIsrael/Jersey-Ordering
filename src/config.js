// ============================================================
// EVENT & PAYMENT CONFIGURATION
// ------------------------------------------------------------
// Payment data below appears in the payment table on the site.
// You can also override the numbers via .env:
//   VITE_TELEBIRR_NUMBER / VITE_CBE_ACCOUNT
// ============================================================

export const EVENT = {
  title: 'University Half-Life Celebration',
  subtitle: 'University Grand Celebration',
  description:
    'A night to remember for every student — music, culture, awards and unity. Pay the registration fee, upload your payment proof, pick your jersey and be part of the biggest celebration of the year.',
  date: 'Coming Soon',
  location: 'Main University Campus',
}

export const PAYMENT = {
  price: '999 Birr',
  priceValue: 999,
  holderName: 'Sami Raga Nado',
  telebirr: import.meta.env.VITE_TELEBIRR_NUMBER || '0912717161',
  cbe: import.meta.env.VITE_CBE_ACCOUNT || '1000348148072',
}

export const PAYMENT_METHODS = ['Telebirr', 'CBE']

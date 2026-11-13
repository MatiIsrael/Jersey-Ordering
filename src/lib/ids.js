/** Generates a unique, human-friendly registration ID, e.g. HL-K3X9QA7. */
export function generateRegistrationId() {
  const time = Date.now().toString(36).toUpperCase()
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => (b % 36).toString(36).toUpperCase())
    .join('')
  return `HL-${time}${rand}`.slice(0, 14)
}

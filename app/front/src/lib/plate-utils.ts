const LETTER = /^[A-Z]$/
const DIGIT = /^[0-9]$/

/** Remove caracteres inválidos e limita a 7 posições alfanuméricas. */
export function stripPlate(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7)
}

/** Formata placa brasileira (padrão antigo AAA-9999 ou Mercosul AAA9A99). */
export function maskPlate(value: string): string {
  const chars = stripPlate(value).split("")
  const out: string[] = []

  for (const char of chars) {
    if (out.length >= 7) break

    const pos = out.length
    if (pos < 3) {
      if (LETTER.test(char)) out.push(char)
      continue
    }
    if (pos === 3) {
      if (DIGIT.test(char)) out.push(char)
      continue
    }
    if (pos === 4) {
      if (LETTER.test(char) || DIGIT.test(char)) out.push(char)
      continue
    }
    if (DIGIT.test(char)) out.push(char)
  }

  const raw = out.join("")
  if (raw.length <= 3) return raw

  const isMercosul = raw.length >= 5 && LETTER.test(raw[4]!)
  if (isMercosul) return raw

  // Com 4 caracteres ainda não dá para distinguir os formatos.
  if (raw.length === 4) return raw

  return `${raw.slice(0, 3)}-${raw.slice(3)}`
}

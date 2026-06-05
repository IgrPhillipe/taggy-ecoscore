const CPF_LENGTH = 11
const CNPJ_LENGTH = 14

function stripDigits(value: string): string {
  return value.replace(/\D/g, "")
}

function hasRepeatedDigits(digits: string): boolean {
  return /^(\d)\1+$/.test(digits)
}

function cpfCheckDigits(digits: string): boolean {
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i)
  let remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  if (remainder !== Number(digits[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i)
  remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  return remainder === Number(digits[10])
}

function cnpjCheckDigits(digits: string): boolean {
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * weights1[i]!
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder
  if (digit1 !== Number(digits[12])) return false

  sum = 0
  for (let i = 0; i < 13; i++) sum += Number(digits[i]) * weights2[i]!
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder
  return digit2 === Number(digits[13])
}

export function stripCpf(value: string): string {
  return stripDigits(value).slice(0, CPF_LENGTH)
}

export function stripCnpj(value: string): string {
  return stripDigits(value).slice(0, CNPJ_LENGTH)
}

export function maskCpf(value: string): string {
  const digits = stripCpf(value)
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2")
}

export function maskCnpj(value: string): string {
  const digits = stripCnpj(value)
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

export function isValidCpf(value: string): boolean {
  const digits = stripCpf(value)
  if (digits.length !== CPF_LENGTH) return false
  if (hasRepeatedDigits(digits)) return false
  return cpfCheckDigits(digits)
}

export function isValidCnpj(value: string): boolean {
  const digits = stripCnpj(value)
  if (digits.length !== CNPJ_LENGTH) return false
  if (hasRepeatedDigits(digits)) return false
  return cnpjCheckDigits(digits)
}

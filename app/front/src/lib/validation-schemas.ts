import { z } from "zod"

import { isValidCnpj, isValidCpf } from "@/lib/document-utils"
import { isValidPlate } from "@/lib/plate-utils"

export const plateSchema = z
  .string()
  .min(1, "Placa é obrigatória")
  .refine(isValidPlate, "Placa inválida")

export const optionalPlateSchema = z
  .string()
  .refine((value) => !value.trim() || isValidPlate(value), "Placa inválida")

export const cpfSchema = z
  .string()
  .min(1, "CPF é obrigatório")
  .refine(isValidCpf, "CPF inválido")

export const optionalCpfSchema = z
  .string()
  .refine((value) => !value.trim() || isValidCpf(value), "CPF inválido")

export const cnpjSchema = z
  .string()
  .min(1, "CNPJ é obrigatório")
  .refine(isValidCnpj, "CNPJ inválido")

export const optionalCnpjSchema = z
  .string()
  .refine((value) => !value.trim() || isValidCnpj(value), "CNPJ inválido")

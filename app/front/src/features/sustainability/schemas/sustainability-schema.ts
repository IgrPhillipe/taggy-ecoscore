import { z } from "zod"

/** contratos-api §1.1 — Métricas de impacto */
export const impactMetricsSchema = z.object({
  daysSavedWithoutQueues: z.number(),
  treeSaved: z.number(),
  totalCarbon: z.number(),
  totalWaterSaved: z.number(),
  paperSaved: z.number(),
})

/** contratos-api §1.2 — Meta semanal */
export const weeklyGoalSchema = z.object({
  weeklyGoal: z.number(),
  weeklyPercentage: z.number(),
})

/** contratos-api §2.1 — Resumo total */
export const passagesSummarySchema = z.object({
  totalPassages: z.number(),
  totalCarbon: z.number(),
  hoursSaved: z.number(),
})

/** CO₂e breakdown per passage (from parameters_snapshot) */
export const co2eBreakdownSchema = z.object({
  co2FossilKg: z.number().nullable().optional(),
  co2BiogenicKg: z.number().nullable().optional(),
  ch4KgCo2e: z.number().nullable().optional(),
  n2oKgCo2e: z.number().nullable().optional(),
  co2eScope1Kg: z.number().nullable().optional(),
  co2eScope2Kg: z.number().nullable().optional(),
  paperCo2AvoidedKg: z.number().nullable().optional(),
  fuelUnit: z.string().nullable().optional(),
})

/** contratos-api §2.2 — Passagem */
export const passageSchema = z.object({
  id: z.number(),
  localName: z.string(),
  passageDatetime: z.string(),
  carbon: z.string(),
  waterSaved: z.string(),
  time: z.string(),
  fuelType: z.string().nullable().optional(),
  co2eBreakdown: co2eBreakdownSchema.nullable().optional(),
})

export const passagesListSchema = z.object({
  totalResults: z.number(),
  page: z.number(),
  lastPassages: z.array(passageSchema),
})

export type ImpactMetrics = z.infer<typeof impactMetricsSchema>
export type WeeklyGoal = z.infer<typeof weeklyGoalSchema>
export type PassagesSummary = z.infer<typeof passagesSummarySchema>
export type Passage = z.infer<typeof passageSchema>
export type PassagesList = z.infer<typeof passagesListSchema>
export type Co2eBreakdown = z.infer<typeof co2eBreakdownSchema>

export type GetPassagesParams = {
  page?: number
  pageSize?: number
  fromDate?: string
  toDate?: string
}

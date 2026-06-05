import type { QueryClient } from "@tanstack/react-query"
import { dashboardKeys, userStatsKeys } from "@/features/dashboard/api/query-keys"
import { driverKeys } from "@/features/drivers/api/query-keys"
import { fleetKeys } from "@/features/fleet/api/fleet-query-keys"
import { organizationKeys } from "@/features/fleet/api/organization-query-keys"
import { vehicleKeys } from "@/features/fleet/api/query-keys"
import { sustainabilityKeys } from "@/features/sustainability/api/query-keys"
import { transactionKeys } from "@/features/transactions/api/query-keys"
import { userQueryKeys } from "@/features/users/api/query-keys"
import { rawVehicleKeys } from "@/features/users/hooks/useGetRawVehicles/useGetRawVehicles"

type VehicleInvalidationOptions = {
  id?: number
  includeRaw?: boolean
}

type EntityInvalidationOptions = {
  id?: number
}

type TransactionImpactOptions = {
  userId?: number
  vehicleId?: number
  fleetId?: number
  organizationId?: number
}

export async function invalidateVehicleQueries(
  queryClient: QueryClient,
  options: VehicleInvalidationOptions = {},
) {
  await queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
  if (options.id != null) {
    await queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(options.id) })
  }
  if (options.includeRaw !== false) {
    await queryClient.invalidateQueries({ queryKey: rawVehicleKeys.all })
  }
  await queryClient.invalidateQueries({ queryKey: fleetKeys.all() })
}

export async function removeVehicleDetailQueries(
  queryClient: QueryClient,
  id: number,
) {
  await queryClient.removeQueries({ queryKey: vehicleKeys.detail(id) })
}

export async function invalidateUserQueries(
  queryClient: QueryClient,
  options: EntityInvalidationOptions = {},
) {
  await queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
  if (options.id != null) {
    await queryClient.invalidateQueries({
      queryKey: userQueryKeys.detail(options.id),
    })
  }
}

export async function removeUserDetailQueries(
  queryClient: QueryClient,
  id: number,
) {
  await queryClient.removeQueries({ queryKey: userQueryKeys.detail(id) })
}

export async function invalidateDriverQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: driverKeys.all() })
}

export async function invalidateOrganizationQueries(
  queryClient: QueryClient,
  options: EntityInvalidationOptions = {},
) {
  await queryClient.invalidateQueries({ queryKey: organizationKeys.all() })
  if (options.id != null) {
    await queryClient.invalidateQueries({
      queryKey: organizationKeys.detail(options.id),
    })
  }
}

export async function invalidateFleetQueries(
  queryClient: QueryClient,
  options: EntityInvalidationOptions = {},
) {
  await queryClient.invalidateQueries({ queryKey: fleetKeys.all() })
  if (options.id != null) {
    await queryClient.invalidateQueries({ queryKey: fleetKeys.detail(options.id) })
  }
}

export async function invalidateTransactionImpactQueries(
  queryClient: QueryClient,
  options: TransactionImpactOptions = {},
) {
  await queryClient.invalidateQueries({ queryKey: dashboardKeys.all() })
  await queryClient.invalidateQueries({ queryKey: transactionKeys.all() })
  await queryClient.invalidateQueries({ queryKey: sustainabilityKeys.all() })

  if (options.userId != null) {
    await queryClient.invalidateQueries({
      queryKey: userStatsKeys.detail(options.userId),
    })
    await queryClient.invalidateQueries({
      queryKey: userQueryKeys.detail(options.userId),
    })
  }

  if (options.vehicleId != null) {
    await queryClient.invalidateQueries({
      queryKey: vehicleKeys.detail(options.vehicleId),
    })
  }

  if (options.fleetId != null) {
    await queryClient.invalidateQueries({
      queryKey: fleetKeys.detail(options.fleetId),
    })
  }

  if (options.organizationId != null) {
    await queryClient.invalidateQueries({
      queryKey: organizationKeys.detail(options.organizationId),
    })
  }
}

export async function invalidateUserVehicleAssignmentQueries(
  queryClient: QueryClient,
  userId: number,
) {
  await invalidateUserQueries(queryClient, { id: userId })
  await invalidateDriverQueries(queryClient)
  await invalidateVehicleQueries(queryClient)
}

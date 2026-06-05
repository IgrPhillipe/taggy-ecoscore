import { api } from "@/lib/http-client";

type SearchParams = Record<string, string | number | boolean | undefined | null>;

function appendSearchParams(params: URLSearchParams, values: SearchParams) {
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
}

function filenameFromDisposition(disposition: string | null, fallbackPath: string): string {
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;\n]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }
    const asciiMatch = disposition.match(/filename="?([^";\n]+)"?/i);
    if (asciiMatch?.[1]) {
      return asciiMatch[1];
    }
  }

  const slugMatch = fallbackPath.match(/\/api\/reports\/([^?]+)/);
  if (slugMatch?.[1]) {
    const slug = slugMatch[1].replace(/\.xlsx$/, "").replace(/\//g, "_");
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `taggy_ecoscore_${slug}_${today}_v1.xlsx`;
  }

  return `taggy_ecoscore_export_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_v1.xlsx`;
}

export async function downloadExportUrl(path: string): Promise<void> {
  const response = await api.get(path);
  const blob = await response.blob();
  const filename = filenameFromDisposition(
    response.headers.get("Content-Disposition"),
    path,
  );
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

export function buildAuditReportUrl(transactionId: number): string {
  return `/api/reports/calculadora.xlsx?transaction_id=${transactionId}`;
}

export function buildTransactionDetailExportUrl(transactionId: number): string {
  return `/api/reports/transactions/${transactionId}.xlsx`;
}

export type DashboardExportParams = {
  organizationId?: number;
  fleetId?: number;
  days?: number;
  fromDate?: string;
  toDate?: string;
};

export function buildDashboardExportUrl(params: DashboardExportParams = {}): string {
  const searchParams = new URLSearchParams();
  appendSearchParams(searchParams, {
    organization_id: params.organizationId,
    fleet_id: params.fleetId,
    days: params.days,
    from_date: params.fromDate,
    to_date: params.toDate,
  });
  const query = searchParams.toString();
  return `/api/reports/dashboard.xlsx${query ? `?${query}` : ""}`;
}

export type FleetListExportParams = {
  organizationId?: number;
  search?: string;
};

export function buildFleetListExportUrl(params: FleetListExportParams = {}): string {
  const searchParams = new URLSearchParams();
  appendSearchParams(searchParams, {
    organization_id: params.organizationId,
    search: params.search,
  });
  const query = searchParams.toString();
  return `/api/reports/fleets.xlsx${query ? `?${query}` : ""}`;
}

export function buildFleetDetailExportUrl(fleetId: number): string {
  return `/api/reports/fleets/${fleetId}.xlsx`;
}

export type VehicleListExportParams = {
  organizationId?: number;
  fleetId?: number;
  search?: string;
  fuelType?: string;
  semFrota?: boolean;
};

export function buildVehicleListExportUrl(params: VehicleListExportParams = {}): string {
  const searchParams = new URLSearchParams();
  appendSearchParams(searchParams, {
    organization_id: params.organizationId,
    fleet_id: params.fleetId,
    search: params.search,
    fuel_type: params.fuelType,
    sem_frota: params.semFrota === true ? "true" : undefined,
  });
  const query = searchParams.toString();
  return `/api/reports/vehicles.xlsx${query ? `?${query}` : ""}`;
}

export type VehicleDetailExportParams = {
  vehicleId: number;
  context?: string;
  uf?: string;
  fromDate?: string;
  toDate?: string;
};

export function buildVehicleDetailExportUrl(params: VehicleDetailExportParams): string {
  const searchParams = new URLSearchParams();
  appendSearchParams(searchParams, {
    context: params.context,
    uf: params.uf,
    from_date: params.fromDate,
    to_date: params.toDate,
  });
  const query = searchParams.toString();
  return `/api/reports/vehicles/${params.vehicleId}.xlsx${query ? `?${query}` : ""}`;
}

export type DriverListExportParams = {
  organizationId?: number;
  fleetId?: number;
  search?: string;
};

export function buildDriverListExportUrl(params: DriverListExportParams = {}): string {
  const searchParams = new URLSearchParams();
  appendSearchParams(searchParams, {
    organization_id: params.organizationId,
    fleet_id: params.fleetId,
    search: params.search,
  });
  const query = searchParams.toString();
  return `/api/reports/drivers.xlsx${query ? `?${query}` : ""}`;
}

export type DriverDetailExportParams = {
  driverId: number;
  plate?: string;
  context?: string;
  uf?: string;
  fromDate?: string;
  toDate?: string;
};

export function buildDriverDetailExportUrl(params: DriverDetailExportParams): string {
  const searchParams = new URLSearchParams();
  appendSearchParams(searchParams, {
    plate: params.plate,
    context: params.context,
    uf: params.uf,
    from_date: params.fromDate,
    to_date: params.toDate,
  });
  const query = searchParams.toString();
  return `/api/reports/drivers/${params.driverId}.xlsx${query ? `?${query}` : ""}`;
}

export type TransactionListExportParams = {
  organizationId?: number;
  fleetId?: number;
  plate?: string;
  context?: string;
  uf?: string;
  fromDate?: string;
  toDate?: string;
};

export function buildTransactionListExportUrl(
  params: TransactionListExportParams = {},
): string {
  const searchParams = new URLSearchParams();
  appendSearchParams(searchParams, {
    organization_id: params.organizationId,
    fleet_id: params.fleetId,
    plate: params.plate,
    context: params.context,
    uf: params.uf,
    from_date: params.fromDate,
    to_date: params.toDate,
  });
  const query = searchParams.toString();
  return `/api/reports/transactions.xlsx${query ? `?${query}` : ""}`;
}

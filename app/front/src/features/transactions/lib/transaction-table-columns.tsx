import type { ColumnDef } from "@tanstack/react-table";
import {
  BooleanBadge,
  EnumBadge,
  RelatedEntityCell,
} from "@/components/DataTable";
import { TRANSACTION_CONTEXT_LABELS } from "@/lib/enum-labels";

export function transactionPlateColumn<T extends { plate?: string | null }>(
  header = "PLACA",
): ColumnDef<T> {
  return {
    accessorKey: "plate",
    header,
    cell: ({ row }) => row.original.plate ?? "—",
  };
}

export function transactionContextColumn<T extends { context: string }>(
  header = "CONTEXTO",
): ColumnDef<T> {
  return {
    accessorKey: "context",
    header,
    cell: ({ row }) => (
      <EnumBadge
        value={row.original.context}
        labels={TRANSACTION_CONTEXT_LABELS}
      />
    ),
  };
}

export function transactionUfColumn<T extends { uf?: string | null }>(
  header = "UF",
): ColumnDef<T> {
  return {
    accessorKey: "uf",
    header,
    cell: ({ row }) =>
      row.original.uf ? (
        <EnumBadge value={row.original.uf} labels={{}} />
      ) : (
        "—"
      ),
  };
}

export function transactionDigitalColumn<T extends { is_digital: boolean }>(
  header = "Digital",
): ColumnDef<T> {
  return {
    accessorKey: "is_digital",
    header,
    cell: ({ row }) => <BooleanBadge value={row.original.is_digital} />,
  };
}

export function transactionUserColumn<T extends { user_id?: number | null }>(
  labelMap: Map<number, string>,
  header = "Usuário",
): ColumnDef<T> {
  return {
    accessorKey: "user_id",
    header,
    cell: ({ row }) => (
      <RelatedEntityCell
        id={row.original.user_id ?? null}
        labelMap={labelMap}
      />
    ),
  };
}

export function transactionVehicleColumn<
  T extends { vehicle_id?: number | null },
>(labelMap: Map<number, string>, header = "Veículo"): ColumnDef<T> {
  return {
    accessorKey: "vehicle_id",
    header,
    cell: ({ row }) => (
      <RelatedEntityCell
        id={row.original.vehicle_id ?? null}
        labelMap={labelMap}
      />
    ),
  };
}

export function transactionOrganizationColumn<
  T extends { organization_id?: number | null },
>(labelMap: Map<number, string>, header = "Organização"): ColumnDef<T> {
  return {
    accessorKey: "organization_id",
    header,
    cell: ({ row }) => (
      <RelatedEntityCell
        id={row.original.organization_id ?? null}
        labelMap={labelMap}
      />
    ),
  };
}

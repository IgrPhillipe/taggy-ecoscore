import { Badge, type BadgeProps } from "@/components/ui/badge";

type EnumBadgeProps = {
  value: string | null | undefined;
  labels: Record<string, string>;
  variant?: BadgeProps["variant"];
  empty?: string;
};

export function EnumBadge({
  value,
  labels,
  variant = "outline",
  empty = "—",
}: EnumBadgeProps) {
  if (value == null || value === "") return empty;
  return <Badge variant={variant}>{labels[value] ?? value}</Badge>;
}

type BooleanBadgeProps = {
  value: boolean | null | undefined;
  variant?: BadgeProps["variant"];
  empty?: string;
};

export function BooleanBadge({
  value,
  variant = "outline",
  empty = "—",
}: BooleanBadgeProps) {
  if (value == null) return empty;
  return (
    <Badge variant={variant}>
      {value ? "Sim" : "Não"}
    </Badge>
  );
}

type RelatedEntityCellProps = {
  id: number | null | undefined;
  labelMap: Map<number, string>;
  empty?: string;
};

export function RelatedEntityCell({
  id,
  labelMap,
  empty = "—",
}: RelatedEntityCellProps) {
  if (id == null) return empty;
  return labelMap.get(id) ?? `#${id}`;
}

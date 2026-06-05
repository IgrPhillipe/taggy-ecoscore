import type { ReactNode } from "react";

type DetailInfoRowProps = {
  label: string;
  value?: ReactNode;
};

export function DetailInfoRow({ label, value }: DetailInfoRowProps) {
  return (
    <div className="flex justify-between border-b border-neutral-100 py-2 text-sm last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value ?? "—"}</span>
    </div>
  );
}

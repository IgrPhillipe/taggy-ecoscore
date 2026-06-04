import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CONTEXT_OPTIONS = [
  { value: "pedagio", label: "Pedágio" },
  { value: "estacionamento", label: "Estacionamento" },
];

type ContextSelectProps = {
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
};

export const ContextSelect = ({
  value,
  onValueChange,
  placeholder = "Contexto",
  className,
}: ContextSelectProps) => (
  <Select
    value={value ?? "all"}
    onValueChange={(v) => onValueChange(v === "all" ? undefined : v)}
  >
    <SelectTrigger
      className={cn("w-40", className)}
      clearable
      hasValue={value != null}
      onClear={() => onValueChange(undefined)}
    >
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      {CONTEXT_OPTIONS.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

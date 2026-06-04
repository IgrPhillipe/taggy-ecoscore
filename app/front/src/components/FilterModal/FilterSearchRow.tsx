import type { ReactNode } from "react";

import { FilterInput } from "@/components/ui/FilterInput";
import { cn } from "@/lib/utils";

type FilterSearchRowProps = {
  searchValue: string;
  onDebouncedSearchChange: (value: string) => void;
  placeholder: string;
  searchId?: string;
  debounceMs?: number;
  plate?: boolean;
  className?: string;
  children: ReactNode;
};

export const FilterSearchRow = ({
  searchValue,
  onDebouncedSearchChange,
  placeholder,
  searchId,
  debounceMs = 300,
  plate = false,
  className,
  children,
}: FilterSearchRowProps) => (
  <div className={cn("flex min-w-0 flex-1 items-center gap-2", className)}>
    <FilterInput
      id={searchId}
      placeholder={placeholder}
      value={searchValue}
      debounceMs={debounceMs}
      onDebouncedChange={onDebouncedSearchChange}
      plate={plate}
      className="min-w-0 flex-1"
    />
    {children}
  </div>
);

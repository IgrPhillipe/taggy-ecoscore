import { useEffect, useState } from "react";
import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";

type FilterInputProps = ComponentProps<typeof Input> & {
  debounceMs?: number;
  onDebouncedChange?: (value: string) => void;
};

export const FilterInput = ({
  debounceMs,
  onDebouncedChange,
  value,
  onChange,
  ...props
}: FilterInputProps) => {
  const [internalValue, setInternalValue] = useState(
    () => (value as string | undefined) ?? "",
  );

  useEffect(() => {
    setInternalValue((value as string | undefined) ?? "");
  }, [value]);

  useEffect(() => {
    if (!debounceMs || !onDebouncedChange) return;
    const timer = setTimeout(() => onDebouncedChange(internalValue), debounceMs);
    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onDebouncedChange]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(event.target.value);
    onChange?.(event);
  };

  return (
    <Input
      {...props}
      value={debounceMs != null ? internalValue : value}
      onChange={handleChange}
    />
  );
};

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { maskPlate } from "@/lib/plate-utils";

type FilterInputProps = ComponentProps<typeof Input> & {
  debounceMs?: number;
  onDebouncedChange?: (value: string) => void;
  plate?: boolean;
};

export const FilterInput = ({
  debounceMs,
  onDebouncedChange,
  value,
  onChange,
  plate = false,
  className,
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
    const timer = setTimeout(
      () => onDebouncedChange(internalValue),
      debounceMs,
    );
    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onDebouncedChange]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = plate
      ? maskPlate(event.target.value)
      : event.target.value;
    setInternalValue(nextValue);
    onChange?.({
      ...event,
      target: { ...event.target, value: nextValue },
    });
  };

  return (
    <Input
      {...props}
      className={className}
      autoComplete={plate ? "off" : props.autoComplete}
      spellCheck={plate ? false : props.spellCheck}
      value={debounceMs != null ? internalValue : value}
      onChange={handleChange}
    />
  );
};

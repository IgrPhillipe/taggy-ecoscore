import { forwardRef, type ChangeEvent, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { maskCpf } from "@/lib/document-utils"
import { cn } from "@/lib/utils"

type CpfInputProps = Omit<ComponentProps<typeof Input>, "onChange"> & {
  onChange?: (value: string) => void
}

export const CpfInput = forwardRef<HTMLInputElement, CpfInputProps>(
  ({ className, value, onChange, onBlur, onClear, ...props }, ref) => {
    const applyMask = (nextValue: string) => onChange?.(maskCpf(nextValue))

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      applyMask(event.target.value)
    }

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      applyMask(event.target.value)
      onBlur?.(event)
    }

    const handleClear = () => {
      onClear?.()
      onChange?.("")
    }

    return (
      <Input
        ref={ref}
        {...props}
        inputMode="numeric"
        value={(value as string | undefined) ?? ""}
        onChange={handleChange}
        onBlur={handleBlur}
        onClear={handleClear}
        className={cn(className)}
        autoComplete="off"
        placeholder={props.placeholder ?? "000.000.000-00"}
        maxLength={14}
      />
    )
  },
)

CpfInput.displayName = "CpfInput"

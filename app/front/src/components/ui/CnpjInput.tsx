import { forwardRef, type ChangeEvent, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { maskCnpj } from "@/lib/document-utils"
import { cn } from "@/lib/utils"

type CnpjInputProps = Omit<ComponentProps<typeof Input>, "onChange"> & {
  onChange?: (value: string) => void
}

export const CnpjInput = forwardRef<HTMLInputElement, CnpjInputProps>(
  ({ className, value, onChange, onBlur, onClear, ...props }, ref) => {
    const applyMask = (nextValue: string) => onChange?.(maskCnpj(nextValue))

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
        placeholder={props.placeholder ?? "00.000.000/0000-00"}
        maxLength={18}
      />
    )
  },
)

CnpjInput.displayName = "CnpjInput"

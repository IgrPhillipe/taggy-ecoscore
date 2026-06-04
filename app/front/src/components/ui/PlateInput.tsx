import { forwardRef, type ChangeEvent, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { maskPlate } from "@/lib/plate-utils"
import { cn } from "@/lib/utils"

type PlateInputProps = Omit<ComponentProps<typeof Input>, "onChange"> & {
  onChange?: (value: string) => void
}

export const PlateInput = forwardRef<HTMLInputElement, PlateInputProps>(
  ({ className, value, onChange, onClear, ...props }, ref) => {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(maskPlate(event.target.value))
    }

    const handleClear = () => {
      onClear?.()
      onChange?.("")
    }

    return (
      <Input
        ref={ref}
        {...props}
        value={(value as string | undefined) ?? ""}
        onChange={handleChange}
        onClear={handleClear}
        className={cn("uppercase", className)}
        autoComplete="off"
        spellCheck={false}
      />
    )
  },
)

PlateInput.displayName = "PlateInput"

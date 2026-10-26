import { forwardRef, useMemo } from "react"
import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: number | null | undefined
  onValueChange: (next: number | null) => void
  prefix?: string
  /** Locale for thousands separators. Defaults to the browser default. */
  locale?: string
}

const NUMERIC = /[^0-9.-]+/g

function formatDisplay(value: number | null | undefined, locale?: string) {
  if (value === null || value === undefined || Number.isNaN(value)) return ""
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onValueChange, prefix, locale, className, ...rest },
  ref,
) {
  const display = useMemo(() => formatDisplay(value, locale), [value, locale])

  return (
    <div className={cn("relative flex items-center", className)}>
      {prefix ? (
        <span className="absolute left-3 text-text-muted text-sm pointer-events-none select-none">
          {prefix}
        </span>
      ) : null}
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(NUMERIC, "")
          if (raw === "" || raw === "-") {
            onValueChange(null)
            return
          }
          const parsed = Number(raw)
          if (Number.isNaN(parsed)) return
          onValueChange(parsed)
        }}
        className={cn(
          "w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-foreground tabular-nums",
          "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent",
          prefix ? "pl-10" : "",
        )}
        {...rest}
      />
    </div>
  )
})

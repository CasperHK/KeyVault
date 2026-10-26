import type { ComponentType, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type StatTone = "default" | "success" | "warning" | "danger" | "info"

const TONE_CLASSES: Record<StatTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
}

export interface StatCard {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ComponentType<{ className?: string }>
  tone?: StatTone
}

export interface StatsRowProps {
  cards: StatCard[]
  className?: string
}

// gridColsClass picks a static Tailwind class so the JIT compiler can find
// it. Dynamic concatenation like "lg:grid-cols-" + n gets purged.
const GRID_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
}

export function StatsRow({ cards, className }: StatsRowProps) {
  if (cards.length === 0) return null
  const cols = GRID_COLS[Math.min(cards.length, 5)] || GRID_COLS[5]
  return (
    <div
      className={cn(
        "grid gap-3 grid-cols-1 sm:grid-cols-2",
        cols,
        className,
      )}
    >
      {cards.map((card) => {
        const Icon = card.icon
        const tone = card.tone || "default"
        return (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-bg-elevated p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                {card.label}
              </span>
              {Icon ? <Icon className={cn("h-4 w-4", TONE_CLASSES[tone])} /> : null}
            </div>
            <div className={cn("mt-2 text-2xl font-semibold tabular-nums", TONE_CLASSES[tone])}>
              {card.value}
            </div>
            {card.sub ? (
              <div className="mt-1 text-xs text-text-secondary">{card.sub}</div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

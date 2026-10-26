import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral"

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  info: "bg-info/15 text-info border-info/30",
  neutral: "bg-bg-hover text-text-secondary border-border",
}

/** Default tone for common payment/order statuses. Override via toneFor prop. */
export const DEFAULT_TONE_MAP: Record<string, StatusTone> = {
  paid: "success",
  active: "success",
  approved: "success",
  completed: "success",
  pending: "warning",
  partially_paid: "warning",
  processing: "info",
  draft: "neutral",
  cancelled: "danger",
  failed: "danger",
  overdue: "danger",
  rejected: "danger",
  disabled: "neutral",
}

export interface StatusBadgeProps<TStatus extends string = string> {
  status: TStatus
  /** Optional explicit label override. Defaults to title-cased status. */
  label?: ReactNode
  toneFor?: (status: TStatus) => StatusTone
  className?: string
}

function defaultLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusBadge<TStatus extends string = string>({
  status,
  label,
  toneFor,
  className,
}: StatusBadgeProps<TStatus>) {
  const tone = toneFor ? toneFor(status) : DEFAULT_TONE_MAP[status] || "neutral"
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label || defaultLabel(status)}
    </span>
  )
}

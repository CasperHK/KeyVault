import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type ConfirmTone = "default" | "danger"

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

type Resolver = (ok: boolean) => void

interface ConfirmContextValue {
  request: (opts: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>")
  }
  return ctx.request
}

interface PendingConfirm extends ConfirmOptions {
  resolve: Resolver
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)

  const request = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve })
    })
  }, [])

  const close = useCallback((ok: boolean) => {
    if (!pending) return
    pending.resolve(ok)
    setPending(null)
  }, [pending])

  useEffect(() => {
    if (!pending) return
    confirmBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false)
      if (e.key === "Enter") close(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pending, close])

  return (
    <ConfirmContext.Provider value={{ request }}>
      {children}
      {pending ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <div
            className="relative w-full max-w-md mx-4 rounded-lg border border-border bg-bg-elevated p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-foreground">{pending.title}</h2>
            {pending.message ? (
              <div className="mt-2 text-sm text-text-secondary">{pending.message}</div>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-bg-hover transition-colors text-sm"
              >
                {pending.cancelLabel || "Cancel"}
              </button>
              <button
                type="button"
                ref={confirmBtnRef}
                onClick={() => close(true)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  pending.tone === "danger"
                    ? "bg-danger text-white hover:opacity-90"
                    : "bg-accent text-accent-fg hover:bg-accent-hover",
                )}
              >
                {pending.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

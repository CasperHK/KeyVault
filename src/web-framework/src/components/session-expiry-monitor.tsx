import { useEffect, useRef, useState } from "react"
import { clearAuth, getAccessToken, refresh } from "@/lib/auth"

const WARNING_SECONDS = 30
const POLL_MS = 1000

function decodeExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number }
    return typeof payload.exp === "number" ? payload.exp : null
  } catch {
    return null
  }
}

function secondsLeft(token: string | null): number | null {
  if (!token) return null
  const exp = decodeExp(token)
  if (!exp) return null
  return Math.floor(exp - Date.now() / 1000)
}

export interface SessionExpiryMonitorProps {
  /** Called when the session is no longer valid (refresh failed or user logged out). */
  onLoggedOut?: () => void
}

export function SessionExpiryMonitor({ onLoggedOut }: SessionExpiryMonitorProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState<number>(WARNING_SECONDS)
  const refreshingRef = useRef(false)

  useEffect(() => {
    const interval = window.setInterval(() => {
      const left = secondsLeft(getAccessToken())
      if (left === null) {
        setShowWarning(false)
        return
      }
      if (left <= 0) {
        setShowWarning(false)
        clearAuth()
        onLoggedOut?.()
        return
      }
      if (left <= WARNING_SECONDS) {
        setShowWarning(true)
        setCountdown(left)
      } else {
        setShowWarning(false)
      }
    }, POLL_MS)
    return () => window.clearInterval(interval)
  }, [onLoggedOut])

  async function stay() {
    if (refreshingRef.current) return
    refreshingRef.current = true
    const tokens = await refresh()
    refreshingRef.current = false
    if (!tokens) {
      setShowWarning(false)
      onLoggedOut?.()
      return
    }
    setShowWarning(false)
  }

  function logout() {
    clearAuth()
    setShowWarning(false)
    onLoggedOut?.()
  }

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-lg border border-border bg-bg-elevated p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-foreground">Session about to expire</h2>
        <p className="mt-2 text-sm text-text-secondary">
          You will be signed out in <span className="tabular-nums font-medium text-foreground">{countdown}</span> seconds.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-bg-hover transition-colors text-sm"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={stay}
            className="px-4 py-2 rounded-md bg-accent text-accent-fg hover:bg-accent-hover transition-colors text-sm font-medium"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}

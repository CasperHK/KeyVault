import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
  sublabel?: string
  disabled?: boolean
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option…",
  emptyMessage = "No matches",
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listboxId = useId()

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel ? o.sublabel.toLowerCase().includes(q) : false),
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new query puts the highlight back on the first match.
  useEffect(() => {
    if (open) setActiveIndex(0)
  }, [open, query])

  function commit(opt: ComboboxOption | undefined) {
    if (!opt || opt.disabled) return
    onChange(opt.value === value ? null : opt.value)
    setOpen(false)
    setQuery("")
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      commit(filtered[activeIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground",
          "hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          "focus:outline-none focus:ring-2 focus:ring-accent/50",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn("truncate text-left", !selected && "text-text-muted")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 text-text-muted shrink-0" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-bg-elevated shadow-lg">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search…"
            className="w-full bg-transparent border-b border-border px-3 py-2 text-sm text-foreground focus:outline-none"
          />
          <ul
            role="listbox"
            id={listboxId}
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-text-muted">{emptyMessage}</li>
            ) : (
              filtered.map((opt, i) => {
                const isActive = i === activeIndex
                const isSelected = opt.value === value
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      commit(opt)
                    }}
                    className={cn(
                      "px-3 py-2 cursor-pointer flex items-start gap-2",
                      isActive ? "bg-bg-hover" : "",
                      opt.disabled ? "opacity-50 cursor-not-allowed" : "",
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        isSelected ? "text-accent" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground truncate">{opt.label}</div>
                      {opt.sublabel ? (
                        <div className="text-xs text-text-muted truncate">{opt.sublabel}</div>
                      ) : null}
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

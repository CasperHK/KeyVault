import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Menu, X, Github } from "lucide-react"

import { MegaMenu, MegaMenuMobile } from "@/components/mega-menu"

const DOCS_URL = "https://gritframework.dev/docs"

// Grit's docs and repository. Links for whoever is building this app, not for
// the people visiting it, so they render in development only. Vite has no
// process.env, hence MODE rather than NODE_ENV.
const DEV = import.meta.env.MODE !== "production"


export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 border border-accent/20">
            <span className="text-accent font-mono font-bold text-sm">W</span>
          </div>
          <span className="text-lg font-bold tracking-tight">web-framework</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <MegaMenu />
          {DEV ? (
            <>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-foreground transition-colors"
              >
                Docs
              </a>
              <a
                href="https://github.com/MUKE-coder/grit"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Grit on GitHub (opens in a new tab)"
                className="text-text-secondary hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" aria-hidden="true" />
              </a>
            </>
          ) : null}
          {/* grit:nav:account-desktop */}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-text-secondary hover:text-foreground transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg">
          <div className="mx-auto max-w-5xl px-6 py-4 flex flex-col gap-3">
            <MegaMenuMobile onNavigate={() => setMobileOpen(false)} />
            {DEV ? (
              <>
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm py-2 text-text-secondary hover:text-foreground transition-colors"
                >
                  Docs
                </a>
                <a
                  href="https://github.com/MUKE-coder/grit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm py-2 text-text-secondary hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </>
            ) : null}
            {/* grit:nav:account-mobile */}
          </div>
        </div>
      ) : null}
    </nav>
  )
}

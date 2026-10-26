import { api } from "./api"

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  avatar?: string
  job_title?: string
  bio?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Tokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export interface LoginResult {
  user: User
  tokens: Tokens
}

interface Envelope<T> {
  data: T
  message?: string
}

interface TOTPChallenge {
  totp_required: true
  pending_token: string
}

const ACCESS_KEY = "grit.access_token"
const REFRESH_KEY = "grit.refresh_token"
const EXPIRES_KEY = "grit.token_expires_at"

export function getAccessToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY)
}

export function getTokenExpiresAt(): number | null {
  const raw = typeof window === "undefined" ? null : localStorage.getItem(EXPIRES_KEY)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}

function persistTokens(tokens: Tokens) {
  localStorage.setItem(ACCESS_KEY, tokens.access_token)
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  localStorage.setItem(EXPIRES_KEY, String(tokens.expires_at))
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(EXPIRES_KEY)
}

/**
 * login() handles the {data:{user,tokens}} envelope that the Go API returns.
 * If the user has TOTP enabled the server replies with
 * {data:{totp_required:true, pending_token}} — surfaced via the totp field
 * on the result so callers can route to a verification screen.
 */
export async function login(email: string, password: string): Promise<LoginResult | { totp: TOTPChallenge }> {
  const res = await api.post<Envelope<LoginResult | TOTPChallenge>>("/api/auth/login", { email, password })
  const data = res.data.data
  if ("totp_required" in data) {
    return { totp: data }
  }
  persistTokens(data.tokens)
  return data
}

export async function verifyTOTP(pending_token: string, code: string): Promise<LoginResult> {
  const res = await api.post<Envelope<LoginResult>>("/api/auth/totp/verify", { pending_token, code })
  persistTokens(res.data.data.tokens)
  return res.data.data
}

export async function register(payload: {
  first_name: string
  last_name: string
  email: string
  password: string
}): Promise<LoginResult> {
  const res = await api.post<Envelope<LoginResult>>("/api/auth/register", payload)
  persistTokens(res.data.data.tokens)
  return res.data.data
}

/** Fetches the current user via /api/auth/me. Throws if unauthenticated. */
export async function me(): Promise<User> {
  const res = await api.get<Envelope<User>>("/api/auth/me")
  return res.data.data
}

/**
 * refresh() exchanges the stored refresh token for a fresh access+refresh
 * pair. Clears auth on failure so the next request bounces to login
 * instead of looping forever on a dead token.
 */
export async function refresh(): Promise<Tokens | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await api.post<Envelope<{ tokens: Tokens }>>("/api/auth/refresh", {
      refresh_token: refreshToken,
    })
    persistTokens(res.data.data.tokens)
    return res.data.data.tokens
  } catch {
    clearAuth()
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/auth/logout")
  } catch {
    // Server-side logout is best-effort — we always clear local state.
  }
  clearAuth()
}

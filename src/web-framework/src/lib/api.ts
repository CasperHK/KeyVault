import axios, { type AxiosError, type AxiosRequestConfig } from "axios"

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ""

const ACCESS_KEY = "grit.access_token"
const REFRESH_KEY = "grit.refresh_token"
const EXPIRES_KEY = "grit.token_expires_at"

// The API is served under a version prefix (/api/v1/...). Endpoints are
// written as "/api/..." throughout the app and pinned to the version in the
// interceptor below, so moving to v2 is a one-line change.
export const API_VERSION = "v1"

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
})

// Attach Authorization + Idempotency-Key on every outgoing request, and pin
// the request to the current API version.
api.interceptors.request.use((config) => {
  const url = config.url ?? ""
  if (
    url.startsWith("/api/") &&
    url !== "/api/ws" &&
    !url.startsWith("/api/" + API_VERSION + "/")
  ) {
    config.url = "/api/" + API_VERSION + url.slice("/api".length)
  }
  const token = typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY)
  if (token && config.headers) {
    config.headers.Authorization = "Bearer " + token
  }
  const method = (config.method || "get").toUpperCase()
  const unsafe = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE"
  if (unsafe && config.headers && !config.headers["Idempotency-Key"]) {
    config.headers["Idempotency-Key"] = crypto.randomUUID()
  }
  // Echo the grit_csrf cookie into X-CSRF-Token on every state-changing request.
  //
  // This client authenticates with a bearer token and the API exempts bearer
  // requests from CSRF, so it looks unnecessary until you remember the admin
  // panel in this same app signs in with cookies. Once it has, the browser holds
  // a grit_access cookie for this host and sends it along with every request the
  // public site makes: the API then treats a sign-up or a login as a
  // cookie-authenticated mutation and refuses it with CSRF_INVALID.
  if (unsafe && config.headers && typeof document !== "undefined") {
    const m = document.cookie.match(/(?:^|; )grit_csrf=([^;]+)/)
    if (m) {
      config.headers["X-CSRF-Token"] = decodeURIComponent(m[1])
    }
  }
  return config
})

// Single-flight refresh: if many requests 401 at once, only one of them
// actually calls /api/auth/refresh; the rest await the same promise.
let inflightRefresh: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh
  inflightRefresh = (async () => {
    const rt = typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY)
    if (!rt) return null
    try {
      const res = await axios.post(API_URL + "/api/auth/refresh", { refresh_token: rt })
      const tokens = res.data?.data?.tokens as
        | { access_token: string; refresh_token: string; expires_at: number }
        | undefined
      if (!tokens) return null
      localStorage.setItem(ACCESS_KEY, tokens.access_token)
      localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
      localStorage.setItem(EXPIRES_KEY, String(tokens.expires_at))
      return tokens.access_token
    } catch {
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
      localStorage.removeItem(EXPIRES_KEY)
      return null
    } finally {
      inflightRefresh = null
    }
  })()
  return inflightRefresh
}

// Retry once on 401 after a refresh. Skip the refresh endpoint itself to
// avoid recursion if the refresh token is the one that died.
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
    const status = err.response?.status
    const url = original?.url ?? ""
    if (status !== 401 || !original || original._retried || url.includes("/api/auth/refresh")) {
      return Promise.reject(err)
    }
    const newToken = await refreshAccessToken()
    if (!newToken) return Promise.reject(err)
    original._retried = true
    original.headers = { ...(original.headers || {}), Authorization: "Bearer " + newToken }
    return api.request(original)
  },
)

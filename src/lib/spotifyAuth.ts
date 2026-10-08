const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined
const REDIRECT_URI = `${window.location.origin}/callback`
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize"
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token"

const SCOPES = [
  "user-read-private",
  "user-top-read",
  "playlist-modify-public",
  "playlist-modify-private",
]

const STORAGE_KEY = "moodcast.spotify.session"
const VERIFIER_KEY = "moodcast.spotify.verifier"

type StoredSession = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

export function hasClientId() {
  return Boolean(CLIENT_ID)
}

function randomString(length: number) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ("0" + b.toString(16)).slice(-2)).join("")
}

function base64UrlEncode(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

async function challengeFrom(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  return base64UrlEncode(digest)
}

function readSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function writeSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
}

export async function beginLogin() {
  if (!CLIENT_ID) throw new Error("Mangler VITE_SPOTIFY_CLIENT_ID i .env")

  const verifier = randomString(48)
  sessionStorage.setItem(VERIFIER_KEY, verifier)

  const url = new URL(AUTH_ENDPOINT)
  url.searchParams.set("client_id", CLIENT_ID)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("redirect_uri", REDIRECT_URI)
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("code_challenge", await challengeFrom(verifier))
  url.searchParams.set("scope", SCOPES.join(" "))

  window.location.assign(url.toString())
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
}

async function requestToken(body: URLSearchParams): Promise<StoredSession> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Spotify avviste innloggingen: ${detail}`)
  }

  const data = (await res.json()) as TokenResponse
  const session: StoredSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  writeSession(session)
  return session
}

/** Bytter ?code= i URL-en mot et token. Returnerer true hvis en innlogging ble fullført. */
export async function completeLoginFromUrl(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get("code")
  const error = params.get("error")

  if (error) {
    window.history.replaceState({}, "", "/")
    throw new Error(`Spotify-innlogging avbrutt: ${error}`)
  }
  if (!code) return false

  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  window.history.replaceState({}, "", "/")

  if (!verifier) throw new Error("Innloggingen utløp. Prøv igjen.")
  if (!CLIENT_ID) throw new Error("Mangler VITE_SPOTIFY_CLIENT_ID i .env")

  await requestToken(
    new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  )

  sessionStorage.removeItem(VERIFIER_KEY)
  return true
}

/** Gir et gyldig access token, eller null hvis brukeren ikke er logget inn. */
export async function getAccessToken(): Promise<string | null> {
  const session = readSession()
  if (!session) return null

  const stillFresh = session.expiresAt - Date.now() > 60_000
  if (stillFresh) return session.accessToken

  if (!session.refreshToken || !CLIENT_ID) {
    clearSession()
    return null
  }

  try {
    const refreshed = await requestToken(
      new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
      }),
    )
    return refreshed.accessToken
  } catch {
    clearSession()
    return null
  }
}

export function isLoggedIn() {
  return readSession() !== null
}

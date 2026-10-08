import type { Mood } from "./mood"
import type { Weather } from "./weather"
import { getAccessToken } from "./spotifyAuth"

const API = "https://api.spotify.com/v1"

export type Track = {
  id: string
  uri: string
  name: string
  artists: string
  album: string
  artwork?: string
  previewUrl?: string
  externalUrl: string
  durationMs: number
  /** Hvor høyt treffet kom i søket. Lavere er mer relevant. */
  rank: number
}

export type SpotifyUser = {
  id: string
  displayName: string
  avatar?: string
}

class SpotifyError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken()
  if (!token) throw new SpotifyError("Ikke logget inn på Spotify", 401)

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (res.status === 204) return undefined as T
  if (!res.ok) {
    let message = `Spotify svarte ${res.status}`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      if (body.error?.message) message = body.error.message
    } catch {
      /* behold standardmeldingen */
    }
    throw new SpotifyError(message, res.status)
  }

  return (await res.json()) as T
}

export async function getMe(): Promise<SpotifyUser> {
  const data = await api<{
    id: string
    display_name: string | null
    images?: Array<{ url: string }>
  }>("/me")

  return {
    id: data.id,
    displayName: data.display_name ?? "Spotify-bruker",
    avatar: data.images?.[0]?.url,
  }
}

type RawTrack = {
  id: string | null
  uri: string
  name: string
  artists: Array<{ name: string }>
  album: { name: string; images?: Array<{ url: string }> }
  preview_url?: string | null
  external_urls: { spotify: string }
  duration_ms: number
  is_playable?: boolean
}

function mapTrack(t: RawTrack, rank: number): Track | null {
  if (!t.id || t.is_playable === false) return null
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: t.artists.map((a) => a.name).join(", "),
    album: t.album.name,
    artwork: t.album.images?.[0]?.url,
    previewUrl: t.preview_url ?? undefined,
    externalUrl: t.external_urls.spotify,
    durationMs: t.duration_ms,
    rank,
  }
}

async function searchTracks(query: string, limit: number, market: string): Promise<Track[]> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(Math.min(50, limit)),
    market,
  })

  try {
    const data = await api<{ tracks: { items: RawTrack[] } }>(`/search?${params}`)
    return data.tracks.items
      .map((t, i) => mapTrack(t, i))
      .filter((t): t is Track => t !== null)
  } catch (err) {
    if (err instanceof SpotifyError && err.status === 404) return []
    throw err
  }
}

async function getTopTracks(): Promise<Track[]> {
  try {
    const data = await api<{ items: RawTrack[] }>(
      "/me/top/tracks?limit=50&time_range=medium_term",
    )
    return data.items
      .map((t, i) => mapTrack(t, i))
      .filter((t): t is Track => t !== null)
  } catch {
    return []
  }
}

/**
 * Spotify fjernet /recommendations for nye apper i november 2024, så vi bygger
 * spillelisten av søketreff i stedet. Mood-verdiene oversettes til søkeord, og
 * brukerens egne toppsanger blandes inn når de matcher stemningen.
 */
function buildQueries(mood: Mood, weather: Weather): string[] {
  const queries: string[] = []
  const energyWord =
    mood.energy >= 0.7 ? "energetic" : mood.energy >= 0.45 ? "groovy" : "calm"
  const valenceWord =
    mood.valence >= 0.65 ? "happy" : mood.valence >= 0.42 ? "bittersweet" : "melancholic"
  const textureWord = mood.acousticness >= 0.6 ? "acoustic" : "electronic"

  for (const seed of mood.seeds) {
    queries.push(`${seed} ${valenceWord}`)
    queries.push(`${seed} ${energyWord}`)
  }

  queries.push(`${valenceWord} ${energyWord} ${textureWord}`)
  queries.push(`${weather.description.toLowerCase()} mood`)
  queries.push(`${mood.season} ${mood.dayPart} playlist`)

  // Nyere musikk får litt plass, men ikke hele lista.
  const year = new Date().getFullYear()
  queries.push(`${mood.seeds[0]} year:${year - 4}-${year}`)

  return queries
}

/**
 * Spotify fjernet popularity-feltet i februar 2026, så vi rangerer etter hvor
 * høyt låten kom i søket og legger på litt tilfeldighet slik at to kjøringer
 * på samme vær ikke gir identisk liste.
 */
function scoreTrack(track: Track): number {
  const relevance = 1 - Math.min(1, track.rank / 25)
  return relevance + Math.random() * 0.45
}

export type PlaylistDraft = {
  title: string
  description: string
  tracks: Track[]
}

export function playlistTitle(mood: Mood, weather: Weather): string {
  return `${mood.label} · ${weather.place.name}`
}

export function playlistDescription(mood: Mood, weather: Weather): string {
  const temp = Math.round(weather.temperature)
  return `Moodcast · ${weather.description}, ${temp}°C · ${mood.dayPart} om ${mood.season}en i ${weather.place.name}. Energi ${Math.round(
    mood.energy * 100,
  )}%, stemning ${Math.round(mood.valence * 100)}%.`
}

export async function buildPlaylist(
  mood: Mood,
  weather: Weather,
  options: { market?: string; size?: number; includeTopTracks?: boolean } = {},
): Promise<PlaylistDraft> {
  const market = options.market ?? "NO"
  const size = options.size ?? 25
  const queries = buildQueries(mood, weather)

  const perQuery = Math.max(6, Math.ceil((size * 3) / queries.length))
  const batches = await Promise.all(
    queries.slice(0, 10).map((q) => searchTracks(q, perQuery, market).catch(() => [])),
  )

  const pool = new Map<string, Track>()
  for (const batch of batches) {
    for (const track of batch) pool.set(track.id, track)
  }

  if (options.includeTopTracks !== false) {
    const top = await getTopTracks()
    // Bland inn noen få favoritter så lista føles personlig.
    for (const track of top.slice(0, 12)) pool.set(track.id, track)
  }

  const ranked = [...pool.values()]
    .sort((a, b) => scoreTrack(b) - scoreTrack(a))
    .slice(0, size)

  // Unngå at samme artist dominerer toppen av lista.
  const seen = new Map<string, number>()
  const spread: Track[] = []
  const overflow: Track[] = []
  for (const track of ranked) {
    const key = track.artists.split(",")[0].trim().toLowerCase()
    const count = seen.get(key) ?? 0
    if (count < 2) {
      seen.set(key, count + 1)
      spread.push(track)
    } else {
      overflow.push(track)
    }
  }

  return {
    title: playlistTitle(mood, weather),
    description: playlistDescription(mood, weather),
    tracks: [...spread, ...overflow].slice(0, size),
  }
}

/**
 * Oppretter spillelisten på brukerens konto.
 *
 * Bruker POST /me/playlists og POST /playlists/{id}/items. De gamle rutene
 * (/users/{id}/playlists og /playlists/{id}/tracks) ble fjernet i februar 2026.
 */
export async function savePlaylist(draft: PlaylistDraft): Promise<{ url: string; id: string }> {
  const playlist = await api<{ id: string; external_urls: { spotify: string } }>(
    "/me/playlists",
    {
      method: "POST",
      body: JSON.stringify({
        name: draft.title,
        description: draft.description,
        public: false,
      }),
    },
  )

  for (let i = 0; i < draft.tracks.length; i += 100) {
    await api(`/playlists/${playlist.id}/items`, {
      method: "POST",
      body: JSON.stringify({ uris: draft.tracks.slice(i, i + 100).map((t) => t.uri) }),
    })
  }

  return { url: playlist.external_urls.spotify, id: playlist.id }
}

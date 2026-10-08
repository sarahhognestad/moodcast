import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MoodPanel } from "./components/MoodPanel"
import { PlaceSearch } from "./components/PlaceSearch"
import { PlaylistPanel } from "./components/PlaylistPanel"
import { WeatherCanvas } from "./components/WeatherCanvas"
import { WeatherPanel } from "./components/WeatherPanel"
import { deriveMood } from "./lib/mood"
import {
  buildPlaylist,
  getMe,
  savePlaylist,
  type PlaylistDraft,
  type SpotifyUser,
} from "./lib/spotify"
import {
  beginLogin,
  clearSession,
  completeLoginFromUrl,
  hasClientId,
  isLoggedIn,
} from "./lib/spotifyAuth"
import { buildTheme } from "./lib/theme"
import {
  fetchWeather,
  fetchWeatherForCurrentPosition,
  type Place,
  type Weather,
} from "./lib/weather"

const DEFAULT_PLACE: Place = {
  name: "Bergen",
  region: "Vestland",
  country: "Norge",
  latitude: 60.3913,
  longitude: 5.3221,
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function App() {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(true)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const [draft, setDraft] = useState<PlaylistDraft | null>(null)
  const [buildingPlaylist, setBuildingPlaylist] = useState(false)
  const [playlistError, setPlaylistError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [savedUrl, setSavedUrl] = useState<string | null>(null)

  const mood = useMemo(
    () => (weather ? deriveMood(weather, new Date()) : null),
    [weather],
  )

  const theme = useMemo(() => {
    if (!weather || !mood) return buildTheme("cloudy", "ettermiddag", true)
    return buildTheme(weather.condition, mood.dayPart, weather.isDay)
  }, [weather, mood])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--sky-1", theme.sky[0])
    root.style.setProperty("--sky-2", theme.sky[1])
    root.style.setProperty("--sky-3", theme.sky[2])
    root.style.setProperty("--accent", theme.accent)
    root.style.setProperty("--text", theme.text)
    root.style.setProperty("--text-muted", theme.textMuted)
    root.style.setProperty("--surface", theme.surface)
    root.style.setProperty("--border", theme.border)
  }, [theme])

  const loadWeather = useCallback(async (place: Place) => {
    setLoadingWeather(true)
    setWeatherError(null)
    setDraft(null)
    setSavedUrl(null)
    try {
      setWeather(await fetchWeather(place))
    } catch (err) {
      setWeatherError(errorMessage(err, "Klarte ikke å hente været"))
    } finally {
      setLoadingWeather(false)
    }
  }, [])

  const useMyLocation = useCallback(async () => {
    setLoadingWeather(true)
    setWeatherError(null)
    setDraft(null)
    setSavedUrl(null)
    try {
      setWeather(await fetchWeatherForCurrentPosition())
    } catch {
      setWeatherError("Fikk ikke posisjonen din. Søk etter et sted i stedet.")
      try {
        setWeather(await fetchWeather(DEFAULT_PLACE))
      } catch {
        /* feilmeldingen over dekker dette */
      }
    } finally {
      setLoadingWeather(false)
    }
  }, [])

  const bootstrapped = useRef(false)
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true

    async function boot() {
      try {
        await completeLoginFromUrl()
      } catch (err) {
        setAuthError(errorMessage(err, "Innloggingen feilet"))
      }

      if (isLoggedIn()) {
        try {
          setUser(await getMe())
        } catch {
          clearSession()
        }
      }

      await loadWeather(DEFAULT_PLACE)
    }

    void boot()
  }, [loadWeather])

  const generate = useCallback(async () => {
    if (!weather || !mood) return
    setBuildingPlaylist(true)
    setPlaylistError(null)
    setSavedUrl(null)
    try {
      const market = weather.place.country === "Norge" ? "NO" : "US"
      setDraft(
        await buildPlaylist(mood, weather, {
          market,
          size: 25,
          includeTopTracks: Boolean(user),
        }),
      )
    } catch (err) {
      setPlaylistError(errorMessage(err, "Klarte ikke å lage spillelisten"))
    } finally {
      setBuildingPlaylist(false)
    }
  }, [weather, mood, user])

  const save = useCallback(async () => {
    if (!draft || !user) return
    setSaving(true)
    setPlaylistError(null)
    try {
      const result = await savePlaylist(draft)
      setSavedUrl(result.url)
    } catch (err) {
      setPlaylistError(errorMessage(err, "Klarte ikke å lagre spillelisten"))
    } finally {
      setSaving(false)
    }
  }, [draft, user])

  async function login() {
    setAuthError(null)
    try {
      await beginLogin()
    } catch (err) {
      setAuthError(errorMessage(err, "Kunne ikke starte innlogging"))
    }
  }

  function logout() {
    clearSession()
    setUser(null)
    setDraft(null)
    setSavedUrl(null)
  }

  return (
    <div className="app">
      <div className="sky" aria-hidden="true" />
      <WeatherCanvas
        particles={theme.particles}
        accent={theme.accent}
        windSpeed={weather?.windSpeed ?? 0}
      />

      <div className="content">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              ◗
            </span>
            <div>
              <h1>Moodcast</h1>
              <p className="muted">Musikk som passer været der du er</p>
            </div>
          </div>

          <div className="topbar-actions">
            <PlaceSearch
              onSelect={loadWeather}
              onUseLocation={useMyLocation}
              busy={loadingWeather}
            />

            {user ? (
              <div className="user-chip">
                {user.avatar && <img src={user.avatar} alt="" />}
                <span>{user.displayName}</span>
                <button type="button" className="link-button" onClick={logout}>
                  Logg ut
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="primary-button"
                onClick={login}
                disabled={!hasClientId()}
                title={
                  hasClientId() ? undefined : "Legg inn VITE_SPOTIFY_CLIENT_ID i .env først"
                }
              >
                Koble til Spotify
              </button>
            )}
          </div>
        </header>

        {authError && <p className="banner error">{authError}</p>}
        {!hasClientId() && (
          <p className="banner">
            Legg inn din Spotify Client ID i <code>.env</code> for å hente ekte låter. Se{" "}
            <code>README.md</code>.
          </p>
        )}

        <main className="layout">
          <div className="column">
            {loadingWeather && !weather && <div className="panel skeleton">Henter været…</div>}
            {weatherError && <p className="banner error">{weatherError}</p>}
            {weather && mood && <WeatherPanel weather={weather} mood={mood} />}
            {mood && <MoodPanel mood={mood} />}

            {mood && (
              <button
                type="button"
                className="generate-button"
                onClick={generate}
                disabled={buildingPlaylist || loadingWeather}
              >
                {buildingPlaylist
                  ? "Setter sammen stemningen…"
                  : draft
                    ? "Lag en ny spilleliste"
                    : "Lag spilleliste"}
              </button>
            )}
          </div>

          <div className="column">
            {playlistError && <p className="banner error">{playlistError}</p>}

            {draft ? (
              <PlaylistPanel
                draft={draft}
                onSave={save}
                saving={saving}
                savedUrl={savedUrl}
                canSave={Boolean(user)}
              />
            ) : (
              <section className="panel empty-state">
                <h2>Ingen spilleliste ennå</h2>
                <p className="muted">
                  {user
                    ? "Trykk «Lag spilleliste» og Moodcast oversetter været, årstiden og tiden på døgnet til 25 låter."
                    : "Koble til Spotify for å hente låter som matcher stemningen utenfor vinduet."}
                </p>
              </section>
            )}
          </div>
        </main>

        <footer className="footer muted">
          Værdata fra Open-Meteo · Musikk fra Spotify · Bakgrunnen endrer seg med været
        </footer>
      </div>
    </div>
  )
}

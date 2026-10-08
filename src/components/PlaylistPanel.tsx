import { useEffect, useRef, useState } from "react"
import type { PlaylistDraft, Track } from "../lib/spotify"

function formatDuration(ms: number) {
  const total = Math.round(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

type Props = {
  draft: PlaylistDraft
  onSave: () => void
  saving: boolean
  savedUrl: string | null
  canSave: boolean
}

export function PlaylistPanel({ draft, onSave, saving, savedUrl, canSave }: Props) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  function togglePreview(track: Track) {
    if (!track.previewUrl) return

    if (playingId === track.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    audioRef.current?.pause()
    const audio = new Audio(track.previewUrl)
    audio.volume = 0.7
    audio.addEventListener("ended", () => setPlayingId(null))
    void audio.play().catch(() => setPlayingId(null))
    audioRef.current = audio
    setPlayingId(track.id)
  }

  const totalMs = draft.tracks.reduce((sum, t) => sum + t.durationMs, 0)
  const totalMinutes = Math.round(totalMs / 60000)

  return (
    <section className="panel playlist-panel">
      <header className="playlist-head">
        <div>
          <p className="eyebrow">Spillelisten din</p>
          <h2>{draft.title}</h2>
          <p className="muted">
            {draft.tracks.length} låter · {totalMinutes} min
          </p>
        </div>

        {savedUrl ? (
          <a className="primary-button" href={savedUrl} target="_blank" rel="noreferrer">
            Åpne i Spotify
          </a>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={onSave}
            disabled={saving || !canSave}
            title={canSave ? undefined : "Logg inn på Spotify for å lagre"}
          >
            {saving ? "Lagrer…" : "Lagre i Spotify"}
          </button>
        )}
      </header>

      <ol className="track-list">
        {draft.tracks.map((track, index) => (
          <li key={track.id} className={playingId === track.id ? "track playing" : "track"}>
            <span className="track-index">{index + 1}</span>

            {track.artwork ? (
              <img src={track.artwork} alt="" className="track-art" loading="lazy" />
            ) : (
              <span className="track-art placeholder" aria-hidden="true" />
            )}

            <div className="track-meta">
              <a href={track.externalUrl} target="_blank" rel="noreferrer">
                {track.name}
              </a>
              <span className="muted">{track.artists}</span>
            </div>

            {track.previewUrl && (
              <button
                type="button"
                className="preview-button"
                onClick={() => togglePreview(track)}
                aria-label={playingId === track.id ? "Stopp smakebit" : "Spill smakebit"}
              >
                {playingId === track.id ? "❙❙" : "▶"}
              </button>
            )}

            <span className="track-duration muted">{formatDuration(track.durationMs)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

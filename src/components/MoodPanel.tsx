import type { Mood } from "../lib/mood"

type Props = {
  mood: Mood
}

const BARS: Array<{ key: keyof Pick<Mood, "valence" | "energy" | "acousticness">; label: string; low: string; high: string }> = [
  { key: "valence", label: "Stemning", low: "Melankolsk", high: "Oppløftende" },
  { key: "energy", label: "Energi", low: "Rolig", high: "Intens" },
  { key: "acousticness", label: "Tekstur", low: "Elektronisk", high: "Akustisk" },
]

export function MoodPanel({ mood }: Props) {
  return (
    <section className="panel mood-panel">
      <p className="eyebrow">Dagens stemning</p>
      <h2 className="mood-label">{mood.label}</h2>
      <p className="mood-blurb">{mood.blurb}</p>

      <div className="mood-bars">
        {BARS.map((bar) => {
          const value = mood[bar.key]
          return (
            <div className="mood-bar" key={bar.key}>
              <div className="mood-bar-head">
                <span>{bar.label}</span>
                <span className="muted">{Math.round(value * 100)}%</span>
              </div>
              <div
                className="mood-bar-track"
                role="meter"
                aria-valuenow={Math.round(value * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={bar.label}
              >
                <div className="mood-bar-fill" style={{ width: `${value * 100}%` }} />
              </div>
              <div className="mood-bar-legend muted">
                <span>{bar.low}</span>
                <span>{bar.high}</span>
              </div>
            </div>
          )
        })}
      </div>

      <ul className="mood-seeds">
        {mood.seeds.slice(0, 6).map((seed) => (
          <li key={seed}>{seed}</li>
        ))}
      </ul>
    </section>
  )
}

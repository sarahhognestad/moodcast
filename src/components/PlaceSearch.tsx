import { useEffect, useRef, useState } from "react"
import { searchPlaces, type Place } from "../lib/weather"

type Props = {
  onSelect: (place: Place) => void
  onUseLocation: () => void
  busy: boolean
}

export function PlaceSearch({ onSelect, onUseLocation, busy }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    let active = true
    const timer = setTimeout(async () => {
      try {
        const places = await searchPlaces(query)
        if (active) {
          setResults(places)
          setOpen(true)
        }
      } catch {
        if (active) setResults([])
      }
    }, 280)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  function choose(place: Place) {
    onSelect(place)
    setQuery("")
    setResults([])
    setOpen(false)
  }

  return (
    <div className="place-search" ref={boxRef}>
      <div className="place-search-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Søk etter sted…"
          aria-label="Søk etter sted"
          disabled={busy}
        />
        <button
          type="button"
          className="ghost-button"
          onClick={onUseLocation}
          disabled={busy}
          title="Bruk min posisjon"
        >
          Min posisjon
        </button>
      </div>

      {open && results.length > 0 && (
        <ul className="place-results">
          {results.map((place) => (
            <li key={`${place.latitude},${place.longitude}`}>
              <button type="button" onClick={() => choose(place)}>
                <strong>{place.name}</strong>
                <span>{[place.region, place.country].filter(Boolean).join(", ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

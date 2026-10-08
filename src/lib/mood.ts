import type { Weather, WeatherCondition } from "./weather"

export type Season = "vinter" | "vår" | "sommer" | "høst"
export type DayPart = "natt" | "morgen" | "formiddag" | "ettermiddag" | "kveld" | "solnedgang"

export type Mood = {
  /** Årstid der brukeren er. */
  season: Season
  /** Grov bøtte for tid på døgnet. */
  dayPart: DayPart
  /** 0 = trist/melankolsk, 1 = glad/lys. */
  valence: number
  /** 0 = rolig/stille, 1 = intens/dansbar. */
  energy: number
  /** 0 = elektronisk/produsert, 1 = akustisk/organisk. */
  acousticness: number
  /** Kort navn på stemningen, vist i UI. */
  label: string
  /** En setning som forklarer valget. */
  blurb: string
  /** Søkeord som sendes til Spotify. */
  seeds: string[]
}

const SEASON_BY_MONTH: Season[] = [
  "vinter", // januar
  "vinter",
  "vår",
  "vår",
  "vår",
  "sommer",
  "sommer",
  "sommer",
  "høst",
  "høst",
  "høst",
  "vinter", // desember
]

export function getSeason(date: Date, latitude: number): Season {
  const season = SEASON_BY_MONTH[date.getMonth()]
  if (latitude >= 0) return season
  const flipped: Record<Season, Season> = {
    vinter: "sommer",
    vår: "høst",
    sommer: "vinter",
    høst: "vår",
  }
  return flipped[season]
}

/** Alle argumenter er minutter etter midnatt i stedets egen tidssone. */
export function getDayPart(now: number, sunrise: number, sunset: number): DayPart {
  if (Math.abs(now - sunset) <= 45) return "solnedgang"
  if (now < sunrise - 60) return "natt"
  if (now < 10 * 60) return "morgen"
  if (now < 12 * 60) return "formiddag"
  if (now < 17 * 60) return "ettermiddag"
  if (now < 23 * 60) return "kveld"
  return "natt"
}

type Nudge = {
  valence: number
  energy: number
  acousticness: number
  seeds: string[]
}

const WEATHER_NUDGE: Record<WeatherCondition, Nudge> = {
  clear: {
    valence: 0.34,
    energy: 0.2,
    acousticness: -0.05,
    seeds: ["feel good", "sunshine pop", "summer hits"],
  },
  partlyCloudy: {
    valence: 0.12,
    energy: 0.06,
    acousticness: 0.05,
    seeds: ["indie pop", "easy listening"],
  },
  cloudy: {
    valence: -0.12,
    energy: -0.1,
    acousticness: 0.12,
    seeds: ["overcast indie", "dream pop"],
  },
  fog: {
    valence: -0.18,
    energy: -0.26,
    acousticness: 0.1,
    seeds: ["ambient", "ethereal", "slowcore"],
  },
  drizzle: {
    valence: -0.14,
    energy: -0.18,
    acousticness: 0.2,
    seeds: ["rainy day", "lo-fi", "bedroom pop"],
  },
  rain: {
    valence: -0.22,
    energy: -0.14,
    acousticness: 0.18,
    seeds: ["rainy day jazz", "melancholy", "neo soul"],
  },
  heavyRain: {
    valence: -0.26,
    energy: 0.08,
    acousticness: 0.02,
    seeds: ["moody", "trip hop", "dark r&b"],
  },
  sleet: {
    valence: -0.3,
    energy: -0.12,
    acousticness: 0.16,
    seeds: ["grey skies", "sad indie", "nordic folk"],
  },
  snow: {
    valence: 0.06,
    energy: -0.24,
    acousticness: 0.3,
    seeds: ["winter acoustic", "piano", "nordic ambient"],
  },
  thunder: {
    valence: -0.1,
    energy: 0.34,
    acousticness: -0.2,
    seeds: ["epic", "post rock", "electronic storm"],
  },
}

const SEASON_NUDGE: Record<Season, Nudge> = {
  vinter: {
    valence: -0.06,
    energy: -0.12,
    acousticness: 0.16,
    seeds: ["winter", "scandinavian"],
  },
  vår: {
    valence: 0.16,
    energy: 0.1,
    acousticness: 0.06,
    seeds: ["spring", "fresh indie"],
  },
  sommer: {
    valence: 0.2,
    energy: 0.18,
    acousticness: -0.08,
    seeds: ["summer", "tropical house"],
  },
  høst: {
    valence: -0.08,
    energy: -0.08,
    acousticness: 0.2,
    seeds: ["autumn", "folk", "singer songwriter"],
  },
}

const DAYPART_NUDGE: Record<DayPart, Nudge> = {
  natt: {
    valence: -0.12,
    energy: -0.16,
    acousticness: 0.0,
    seeds: ["late night", "downtempo", "midnight"],
  },
  morgen: {
    valence: 0.14,
    energy: -0.04,
    acousticness: 0.18,
    seeds: ["morning coffee", "gentle wake up"],
  },
  formiddag: {
    valence: 0.12,
    energy: 0.12,
    acousticness: 0.04,
    seeds: ["focus", "upbeat acoustic"],
  },
  ettermiddag: {
    valence: 0.08,
    energy: 0.16,
    acousticness: -0.04,
    seeds: ["afternoon drive", "groove"],
  },
  solnedgang: {
    valence: 0.1,
    energy: 0.04,
    acousticness: 0.02,
    seeds: ["golden hour", "sunset chill", "balearic"],
  },
  kveld: {
    valence: -0.02,
    energy: -0.06,
    acousticness: 0.08,
    seeds: ["evening jazz", "wind down", "soul"],
  },
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

function describe(valence: number, energy: number): { label: string; vibe: string } {
  const high = energy >= 0.6
  const low = energy <= 0.35
  const bright = valence >= 0.6
  const dark = valence <= 0.38

  if (bright && high) return { label: "Euforisk", vibe: "høy energi og godt humør" }
  if (bright && low) return { label: "Solfylt ro", vibe: "lyst og lavmælt" }
  if (bright) return { label: "Lett og ledig", vibe: "avslappet optimisme" }
  if (dark && high) return { label: "Stormfullt", vibe: "mørkt og intenst" }
  if (dark && low) return { label: "Melankolsk", vibe: "stille og innadvendt" }
  if (dark) return { label: "Gråtonet", vibe: "dempet og ettertenksomt" }
  if (high) return { label: "Drivende", vibe: "jevnt driv" }
  if (low) return { label: "Dvelende", vibe: "rolig og romslig" }
  return { label: "Balansert", vibe: "midt på treet, i god forstand" }
}

export function deriveMood(weather: Weather, now = new Date()): Mood {
  const season = getSeason(now, weather.place.latitude)
  const dayPart = getDayPart(
    weather.localMinutes,
    weather.sunriseMinutes,
    weather.sunsetMinutes,
  )

  const weatherNudge = WEATHER_NUDGE[weather.condition]
  const seasonNudge = SEASON_NUDGE[season]
  const dayPartNudge = DAYPART_NUDGE[dayPart]

  let valence = 0.5 + weatherNudge.valence + seasonNudge.valence + dayPartNudge.valence
  let energy = 0.5 + weatherNudge.energy + seasonNudge.energy + dayPartNudge.energy
  let acousticness =
    0.5 + weatherNudge.acousticness + seasonNudge.acousticness + dayPartNudge.acousticness

  // Temperatur trekker energien: kaldt = mer innadvendt, varmt = mer utadvendt.
  const tempFactor = (weather.apparentTemperature - 10) / 40
  energy += tempFactor * 0.16
  valence += tempFactor * 0.1

  // Kraftig vind gir litt mer uro.
  if (weather.windSpeed > 30) energy += 0.08

  // Kompakt skydekke demper.
  if (weather.cloudCover > 85) valence -= 0.05

  valence = clamp01(valence)
  energy = clamp01(energy)
  acousticness = clamp01(acousticness)

  const { label, vibe } = describe(valence, energy)

  const seeds = [
    ...weatherNudge.seeds,
    ...dayPartNudge.seeds,
    ...seasonNudge.seeds,
  ]

  const temp = Math.round(weather.temperature)
  const blurb = `${weather.description.toLowerCase()} og ${temp}° i ${weather.place.name}, ${dayPart} om ${season}en. Da blir det ${vibe}.`

  return { season, dayPart, valence, energy, acousticness, label, blurb, seeds }
}

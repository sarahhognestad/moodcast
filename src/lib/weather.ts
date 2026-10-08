export type WeatherCondition =
  | "clear"
  | "partlyCloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavyRain"
  | "sleet"
  | "snow"
  | "thunder"

export type Place = {
  name: string
  region?: string
  country?: string
  latitude: number
  longitude: number
}

export type Weather = {
  place: Place
  condition: WeatherCondition
  weatherCode: number
  description: string
  temperature: number
  apparentTemperature: number
  humidity: number
  cloudCover: number
  windSpeed: number
  precipitation: number
  isDay: boolean
  /** Minutter etter midnatt, i stedets egen tidssone. */
  sunriseMinutes: number
  sunsetMinutes: number
  localMinutes: number
  localTime: string
  timezone: string
}

/** Leser "2026-09-30T17:45" som minutter etter midnatt, uten tidssone-tolkning. */
function minutesFromIso(iso: string): number {
  const time = iso.split("T")[1] ?? "12:00"
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + (minutes || 0)
}

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

const WMO: Record<number, { condition: WeatherCondition; text: string }> = {
  0: { condition: "clear", text: "Klarvær" },
  1: { condition: "clear", text: "Stort sett klart" },
  2: { condition: "partlyCloudy", text: "Delvis skyet" },
  3: { condition: "cloudy", text: "Overskyet" },
  45: { condition: "fog", text: "Tåke" },
  48: { condition: "fog", text: "Rimtåke" },
  51: { condition: "drizzle", text: "Lett yr" },
  53: { condition: "drizzle", text: "Yr" },
  55: { condition: "drizzle", text: "Tett yr" },
  56: { condition: "sleet", text: "Underkjølt yr" },
  57: { condition: "sleet", text: "Kraftig underkjølt yr" },
  61: { condition: "rain", text: "Lett regn" },
  63: { condition: "rain", text: "Regn" },
  65: { condition: "heavyRain", text: "Kraftig regn" },
  66: { condition: "sleet", text: "Underkjølt regn" },
  67: { condition: "sleet", text: "Kraftig underkjølt regn" },
  71: { condition: "snow", text: "Lett snø" },
  73: { condition: "snow", text: "Snø" },
  75: { condition: "snow", text: "Kraftig snøfall" },
  77: { condition: "snow", text: "Snøkorn" },
  80: { condition: "rain", text: "Regnbyter" },
  81: { condition: "rain", text: "Regnbyter" },
  82: { condition: "heavyRain", text: "Kraftige regnbyter" },
  85: { condition: "snow", text: "Snøbyter" },
  86: { condition: "snow", text: "Kraftige snøbyter" },
  95: { condition: "thunder", text: "Tordenvær" },
  96: { condition: "thunder", text: "Torden med hagl" },
  99: { condition: "thunder", text: "Kraftig torden med hagl" },
}

function decodeWeatherCode(code: number) {
  return WMO[code] ?? { condition: "cloudy" as WeatherCondition, text: "Ukjent vær" }
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
  url.searchParams.set("name", trimmed)
  url.searchParams.set("count", "6")
  url.searchParams.set("language", "no")
  url.searchParams.set("format", "json")

  const res = await fetch(url)
  if (!res.ok) throw new Error("Klarte ikke å søke etter sted")
  const data = (await res.json()) as {
    results?: Array<{
      name: string
      admin1?: string
      country?: string
      latitude: number
      longitude: number
    }>
  }

  return (data.results ?? []).map((r) => ({
    name: r.name,
    region: r.admin1,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  }))
}

async function reverseGeocode(latitude: number, longitude: number): Promise<Place> {
  const fallback: Place = {
    name: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
    latitude,
    longitude,
  }

  try {
    const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client")
    url.searchParams.set("latitude", String(latitude))
    url.searchParams.set("longitude", String(longitude))
    url.searchParams.set("localityLanguage", "no")

    const res = await fetch(url)
    if (!res.ok) return fallback
    const data = (await res.json()) as {
      city?: string
      locality?: string
      principalSubdivision?: string
      countryName?: string
    }

    const name = data.city || data.locality || data.principalSubdivision
    if (!name) return fallback

    return {
      name,
      region: data.principalSubdivision,
      country: data.countryName,
      latitude,
      longitude,
    }
  } catch {
    return fallback
  }
}

export async function fetchWeather(place: Place): Promise<Weather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(place.latitude))
  url.searchParams.set("longitude", String(place.longitude))
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
    ].join(","),
  )
  url.searchParams.set("daily", "sunrise,sunset")
  url.searchParams.set("timezone", "auto")
  url.searchParams.set("forecast_days", "1")

  const res = await fetch(url)
  if (!res.ok) throw new Error("Klarte ikke å hente værdata")

  const data = (await res.json()) as {
    timezone: string
    current: {
      time: string
      temperature_2m: number
      relative_humidity_2m: number
      apparent_temperature: number
      is_day: number
      precipitation: number
      weather_code: number
      cloud_cover: number
      wind_speed_10m: number
    }
    daily: { sunrise: string[]; sunset: string[] }
  }

  const code = data.current.weather_code
  const decoded = decodeWeatherCode(code)

  return {
    place,
    condition: decoded.condition,
    weatherCode: code,
    description: decoded.text,
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    cloudCover: data.current.cloud_cover,
    windSpeed: data.current.wind_speed_10m,
    precipitation: data.current.precipitation,
    isDay: data.current.is_day === 1,
    sunriseMinutes: minutesFromIso(data.daily.sunrise[0]),
    sunsetMinutes: minutesFromIso(data.daily.sunset[0]),
    localMinutes: minutesFromIso(data.current.time),
    localTime: formatMinutes(minutesFromIso(data.current.time)),
    timezone: data.timezone,
  }
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Nettleseren støtter ikke posisjonstjenester"))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10_000,
      maximumAge: 5 * 60 * 1000,
    })
  })
}

export async function fetchWeatherForCurrentPosition(): Promise<Weather> {
  const pos = await getCurrentPosition()
  const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
  return fetchWeather(place)
}

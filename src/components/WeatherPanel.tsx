import type { Mood } from "../lib/mood"
import type { Weather } from "../lib/weather"

const ICONS: Record<string, string> = {
  clear: "☀︎",
  partlyCloudy: "⛅︎",
  cloudy: "☁︎",
  fog: "≋",
  drizzle: "☂︎",
  rain: "☔︎",
  heavyRain: "☔︎",
  sleet: "☃︎",
  snow: "❄︎",
  thunder: "☈",
}

type Props = {
  weather: Weather
  mood: Mood
}

export function WeatherPanel({ weather, mood }: Props) {
  return (
    <section className="panel weather-panel">
      <div className="weather-headline">
        <span className="weather-icon" aria-hidden="true">
          {weather.isDay || mood.dayPart === "solnedgang" ? ICONS[weather.condition] : "☾"}
        </span>
        <div>
          <h2>{weather.place.name}</h2>
          <p className="muted">
            {weather.description} · kl. {weather.localTime}
          </p>
        </div>
        <span className="weather-temp">{Math.round(weather.temperature)}°</span>
      </div>

      <dl className="weather-facts">
        <div>
          <dt>Føles som</dt>
          <dd>{Math.round(weather.apparentTemperature)}°</dd>
        </div>
        <div>
          <dt>Vind</dt>
          <dd>{Math.round(weather.windSpeed)} km/t</dd>
        </div>
        <div>
          <dt>Skydekke</dt>
          <dd>{Math.round(weather.cloudCover)} %</dd>
        </div>
        <div>
          <dt>Årstid</dt>
          <dd className="capitalize">{mood.season}</dd>
        </div>
        <div>
          <dt>Døgn</dt>
          <dd className="capitalize">{mood.dayPart}</dd>
        </div>
        <div>
          <dt>Fuktighet</dt>
          <dd>{Math.round(weather.humidity)} %</dd>
        </div>
      </dl>
    </section>
  )
}

import type { DayPart } from "./mood"
import type { WeatherCondition } from "./weather"

export type Theme = {
  /** Fargestopp for bakgrunnsgradienten, mørkeste sist. */
  sky: [string, string, string]
  /** Aksentfarge for knapper og fremheving. */
  accent: string
  /** Hovedtekstfarge. */
  text: string
  /** Dempet tekstfarge. */
  textMuted: string
  /** Bakgrunn for kort, med alfa. */
  surface: string
  /** Kantlinje for kort, med alfa. */
  border: string
  /** Hvilken partikkeleffekt som skal tegnes. */
  particles: "none" | "rain" | "heavyRain" | "snow" | "sleet" | "stars" | "haze" | "lightning"
}

type Palette = Pick<Theme, "sky" | "accent">

const DAY: Record<WeatherCondition, Palette> = {
  clear: { sky: ["#7fd8ff", "#3ba7e8", "#0e5fa8"], accent: "#ffd166" },
  partlyCloudy: { sky: ["#a8d8f0", "#7fa8cc", "#3f6d99"], accent: "#ffd7a1" },
  cloudy: { sky: ["#b6c2cc", "#8593a1", "#525f6b"], accent: "#e8b88a" },
  fog: { sky: ["#d4d8da", "#a3aab0", "#6f767c"], accent: "#c9b8a8" },
  drizzle: { sky: ["#9fb4c4", "#6e8698", "#41525f"], accent: "#8fd4d0" },
  rain: { sky: ["#8397a8", "#57697a", "#303e4a"], accent: "#6fc7d4" },
  heavyRain: { sky: ["#6b7d8c", "#41505d", "#212b35"], accent: "#5bb8cc" },
  sleet: { sky: ["#a5b2bd", "#71808d", "#414c57"], accent: "#a8d0e0" },
  snow: { sky: ["#e8f1f7", "#b9cbd9", "#7d93a5"], accent: "#7fb0d4" },
  thunder: { sky: ["#5d6472", "#3a3f4d", "#1a1d26"], accent: "#c9a3ff" },
}

const NIGHT: Record<WeatherCondition, Palette> = {
  clear: { sky: ["#2a4670", "#16254a", "#070b1c"], accent: "#ffe38a" },
  partlyCloudy: { sky: ["#2e4361", "#1a2840", "#0a0f1d"], accent: "#ffd9a8" },
  cloudy: { sky: ["#333d4a", "#1f262f", "#0d1116"], accent: "#d8b894" },
  fog: { sky: ["#454c54", "#2a2f36", "#14171b"], accent: "#b8ada0" },
  drizzle: { sky: ["#2b3a47", "#1a242e", "#0a0f14"], accent: "#7fc4c4" },
  rain: { sky: ["#25333f", "#151f28", "#080c10"], accent: "#66b8c7" },
  heavyRain: { sky: ["#1e2a35", "#111920", "#05080b"], accent: "#55a8bd" },
  sleet: { sky: ["#2d3841", "#1b2228", "#0b0e12"], accent: "#93bdd1" },
  snow: { sky: ["#3c4d61", "#25323f", "#101820"], accent: "#a8cce6" },
  thunder: { sky: ["#2b2f3d", "#191c26", "#080a0f"], accent: "#b894ff" },
}

const SUNSET: Record<WeatherCondition, Palette> = {
  clear: { sky: ["#ffb26b", "#f26d5b", "#7b3f8c"], accent: "#fff0a8" },
  partlyCloudy: { sky: ["#f5a97a", "#d9706e", "#6b3d7a"], accent: "#ffe3a8" },
  cloudy: { sky: ["#c89a86", "#8f6a70", "#4a3a52"], accent: "#f0c18a" },
  fog: { sky: ["#c9ac9c", "#907b7c", "#514552"], accent: "#e0c0a0" },
  drizzle: { sky: ["#a88a8a", "#6e5f70", "#3a3448"], accent: "#9fd0c4" },
  rain: { sky: ["#8a7480", "#584c60", "#2b2635"], accent: "#7fc0cc" },
  heavyRain: { sky: ["#6e5f6b", "#42394a", "#1d1925"], accent: "#6bb0c4" },
  sleet: { sky: ["#9a8a94", "#645a68", "#332e3b"], accent: "#a8c4d8" },
  snow: { sky: ["#e0bfc4", "#a88f9e", "#5c4f62"], accent: "#8fb8d8" },
  thunder: { sky: ["#6b5a70", "#3e3448", "#1a1622"], accent: "#c9a3ff" },
}

const PARTICLES: Record<WeatherCondition, Theme["particles"]> = {
  clear: "none",
  partlyCloudy: "none",
  cloudy: "none",
  fog: "haze",
  drizzle: "rain",
  rain: "rain",
  heavyRain: "heavyRain",
  sleet: "sleet",
  snow: "snow",
  thunder: "lightning",
}

function isLight(sky: [string, string, string]) {
  const hex = sky[1].slice(1)
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62
}

export function buildTheme(
  condition: WeatherCondition,
  dayPart: DayPart,
  isDay: boolean,
): Theme {
  const table = dayPart === "solnedgang" ? SUNSET : isDay ? DAY : NIGHT
  const palette = table[condition]
  const light = isLight(palette.sky)

  let particles = PARTICLES[condition]
  if (particles === "none" && !isDay && condition === "clear") particles = "stars"

  return {
    sky: palette.sky,
    accent: palette.accent,
    text: light ? "#141a22" : "#f4f7fa",
    textMuted: light ? "rgba(20, 26, 34, 0.62)" : "rgba(244, 247, 250, 0.68)",
    surface: light ? "rgba(255, 255, 255, 0.42)" : "rgba(255, 255, 255, 0.09)",
    border: light ? "rgba(20, 26, 34, 0.14)" : "rgba(255, 255, 255, 0.16)",
    particles,
  }
}

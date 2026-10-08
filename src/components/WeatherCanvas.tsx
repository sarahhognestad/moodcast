import { useEffect, useRef } from "react"
import type { Theme } from "../lib/theme"

type Particle = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  size: number
  drift: number
  phase: number
}

type Props = {
  particles: Theme["particles"]
  accent: string
  windSpeed: number
}

export function WeatherCanvas({ particles, accent, windSpeed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (particles === "none" || reduceMotion) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    let width = 0
    let height = 0
    let dpr = 1

    function resize() {
      if (!canvas) return
      dpr = Math.min(2, window.devicePixelRatio || 1)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener("resize", resize)

    const counts: Record<Exclude<Theme["particles"], "none">, number> = {
      rain: 220,
      heavyRain: 480,
      sleet: 260,
      snow: 180,
      stars: 150,
      haze: 26,
      lightning: 420,
    }

    const count = counts[particles as Exclude<Theme["particles"], "none">]
    const wind = Math.min(2.4, windSpeed / 22)

    const pool: Particle[] = Array.from({ length: count }, () => spawn(true))

    function spawn(initial: boolean): Particle {
      const z = 0.35 + Math.random() * 0.65
      const base: Particle = {
        x: Math.random() * width,
        y: initial ? Math.random() * height : -20,
        z,
        vx: 0,
        vy: 0,
        size: 1,
        drift: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
      }

      switch (particles) {
        case "rain":
        case "lightning":
          base.vy = (6.5 + Math.random() * 5) * z
          base.vx = wind * 2.2 * z
          base.size = (9 + Math.random() * 12) * z
          break
        case "heavyRain":
          base.vy = (11 + Math.random() * 7) * z
          base.vx = wind * 3.2 * z
          base.size = (14 + Math.random() * 16) * z
          break
        case "sleet":
          base.vy = (4 + Math.random() * 4) * z
          base.vx = wind * 2.6 * z
          base.size = (2 + Math.random() * 2) * z
          break
        case "snow":
          base.vy = (0.6 + Math.random() * 1.1) * z
          base.vx = wind * 0.7 * z
          base.size = (1.6 + Math.random() * 2.8) * z
          break
        case "stars":
          base.y = Math.random() * height * 0.8
          base.vy = 0
          base.size = 0.6 + Math.random() * 1.5
          break
        case "haze":
          base.y = Math.random() * height
          base.vx = (0.25 + Math.random() * 0.5) * (wind || 0.6)
          base.vy = 0
          base.size = 90 + Math.random() * 190
          break
      }

      return base
    }

    let raf = 0
    let t = 0
    let flash = 0
    let nextFlash = 120 + Math.random() * 260

    function draw() {
      t += 1
      ctx!.clearRect(0, 0, width, height)

      if (particles === "stars") {
        for (const p of pool) {
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.012 + p.phase))
          ctx!.globalAlpha = twinkle * p.z
          ctx!.fillStyle = "#ffffff"
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx!.fill()
        }
        ctx!.globalAlpha = 1
        raf = requestAnimationFrame(draw)
        return
      }

      if (particles === "haze") {
        for (const p of pool) {
          p.x += p.vx
          if (p.x - p.size > width) p.x = -p.size
          const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
          grad.addColorStop(0, "rgba(255, 255, 255, 0.075)")
          grad.addColorStop(1, "rgba(255, 255, 255, 0)")
          ctx!.fillStyle = grad
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx!.fill()
        }
        raf = requestAnimationFrame(draw)
        return
      }

      if (particles === "lightning") {
        if (t > nextFlash) {
          flash = 1
          nextFlash = t + 150 + Math.random() * 340
        }
        if (flash > 0) {
          ctx!.fillStyle = `rgba(255, 255, 255, ${flash * 0.5})`
          ctx!.fillRect(0, 0, width, height)
          flash -= 0.085
        }
      }

      const isDrop =
        particles === "rain" || particles === "heavyRain" || particles === "lightning"

      for (const p of pool) {
        if (isDrop) {
          p.x += p.vx
          p.y += p.vy
          ctx!.strokeStyle = `rgba(210, 232, 245, ${0.14 + p.z * 0.4})`
          ctx!.lineWidth = Math.max(0.6, p.z * 1.4)
          ctx!.beginPath()
          ctx!.moveTo(p.x, p.y)
          ctx!.lineTo(p.x - p.vx * 1.6, p.y - p.size)
          ctx!.stroke()
        } else {
          p.drift += 0.016
          p.x += p.vx + Math.sin(p.drift) * (particles === "snow" ? 0.7 : 0.3)
          p.y += p.vy
          ctx!.fillStyle =
            particles === "snow"
              ? `rgba(255, 255, 255, ${0.35 + p.z * 0.5})`
              : `rgba(224, 240, 248, ${0.3 + p.z * 0.45})`
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx!.fill()
        }

        if (p.y > height + 24 || p.x < -60 || p.x > width + 60) {
          Object.assign(p, spawn(false))
        }
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [particles, accent, windSpeed])

  return <canvas ref={canvasRef} className="weather-canvas" aria-hidden="true" />
}

export interface ChartPoint {
  x: number
  y: number
  valueLabel: string
  label: string
  leftPct: string
  topPct: string
}

export interface ValueChart {
  valueSeries: ChartPoint[]
  linePoints: string
  endX: string
  endY: string
}

/**
 * Interactive cellar-value trend: last 10 quarters ending Q2 2026.
 * `money` formats the running value in the active currency.
 */
export function valueChart(total: number, money: (n: number) => string): ValueChart {
  const factors = [0.62, 0.66, 0.69, 0.72, 0.76, 0.81, 0.84, 0.9, 0.95, 1]
  const values = factors.map((f) => Math.round(total * f))
  // quarter labels, 9 back from Q2 2026
  let qy = 2026
  let qq = 2
  const labels: string[] = []
  for (let i = 0; i < 10; i++) {
    labels.unshift(`Q${qq} ’${String(qy).slice(2)}`)
    qq--
    if (qq < 1) {
      qq = 4
      qy--
    }
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = 0.16
  const n = values.length
  const series: ChartPoint[] = values.map((v, i) => {
    const xFrac = n === 1 ? 0 : i / (n - 1)
    const yFrac = max === min ? 0.5 : pad + (1 - (v - min) / (max - min)) * (1 - 2 * pad)
    return {
      x: xFrac * 100,
      y: yFrac * 100,
      valueLabel: money(v),
      label: labels[i],
      leftPct: `${(xFrac * 100).toFixed(2)}%`,
      topPct: `${(yFrac * 100).toFixed(2)}%`,
    }
  })
  return {
    valueSeries: series,
    linePoints: series.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
    endX: `${series[n - 1].x.toFixed(2)}%`,
    endY: series[n - 1].topPct,
  }
}

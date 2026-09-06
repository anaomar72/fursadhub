import { useId, useState } from 'react'
import { cn } from '../../lib/utils/cn'

export interface LineChartPoint {
  /** Axis label, already localised by the caller. */
  label: string
  value: number
  /** Long form for the tooltip and the table, e.g. "March 2026". Falls back to `label`. */
  fullLabel?: string
}

export interface LineChartProps {
  points: LineChartPoint[]
  /** Names the series. A single-series chart needs no legend — this is what identifies it. */
  seriesLabel: string
  /** Accessible description of what the chart shows, used as the figure's label. */
  caption: string
  /** Column heading for the value in the table view. */
  valueLabel: string
  /** Toggle label for the "show the numbers" disclosure. */
  tableLabel: string
  emptyLabel: string
  className?: string
}

const VIEW_W = 640
const VIEW_H = 240
const PAD_L = 44
const PAD_R = 12
const PAD_T = 12
const PAD_B = 32
const GRID_LINES = 4

/**
 * A single-series line chart over time, drawn as inline SVG.
 *
 * <p>One series, so there is deliberately no legend: `seriesLabel` names it in the heading, which
 * is the whole identity the reader needs. Colour comes from `--color-chart-series`, whose dark step
 * is chosen rather than flipped — brand blue is too dark to read as a 2px line against the dark
 * surface — and both steps are validated for lightness, chroma and 3:1 contrast against their own
 * surface.
 *
 * <p>Text wears text tokens throughout; the only thing wearing the series colour is the line and its
 * markers. The grid is recessive, there are no value labels on individual points (the crosshair
 * answers "what is this point?" on demand), and the same numbers are available as a real table for
 * anyone who cannot or would rather not read the plot.
 *
 * <p>The SVG scales with its container via `viewBox` and `preserveAspectRatio`, so it never causes
 * page-level horizontal overflow at any width.
 */
export function LineChart({
  points,
  seriesLabel,
  caption,
  valueLabel,
  tableLabel,
  emptyLabel,
  className,
}: LineChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const tableId = useId()

  if (points.length === 0) {
    return (
      <p className={cn('py-10 text-center text-sm text-foreground-secondary', className)}>{emptyLabel}</p>
    )
  }

  // The axis always starts at zero — a line chart of counts that starts elsewhere exaggerates every
  // change on it. `niceMax` rounds up so the top gridline is a number worth printing.
  const rawMax = Math.max(...points.map((point) => point.value))
  const max = niceMax(rawMax)
  const plotW = VIEW_W - PAD_L - PAD_R
  const plotH = VIEW_H - PAD_T - PAD_B

  const x = (index: number) =>
    points.length === 1 ? PAD_L + plotW / 2 : PAD_L + (index / (points.length - 1)) * plotW
  const y = (value: number) => PAD_T + plotH - (max === 0 ? 0 : value / max) * plotH

  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')
  const gridValues = Array.from({ length: GRID_LINES + 1 }, (_, index) => (max / GRID_LINES) * index)

  // One label per point crowds at twelve months on a phone; every other one stays legible.
  const labelEvery = points.length > 8 ? 2 : 1
  const activePoint = active === null ? null : points[active]

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <figure className="m-0 flex flex-col gap-2">
        <figcaption className="sr-only">{caption}</figcaption>
        <div className="relative">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={caption}
            className="h-56 w-full"
            onMouseLeave={() => setActive(null)}
          >
            {gridValues.map((value) => (
              <g key={value}>
                <line
                  x1={PAD_L}
                  x2={VIEW_W - PAD_R}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="var(--color-chart-grid)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <text
                  x={PAD_L - 8}
                  y={y(value) + 4}
                  textAnchor="end"
                  className="fill-muted text-[11px]"
                  style={{ fontSize: 11 }}
                >
                  {Math.round(value)}
                </text>
              </g>
            ))}

            {points.length > 1 && (
              <polyline
                points={line}
                fill="none"
                stroke="var(--color-chart-series)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {points.map((point, index) => (
              <g key={point.label}>
                {active === index && (
                  <line
                    x1={x(index)}
                    x2={x(index)}
                    y1={PAD_T}
                    y2={PAD_T + plotH}
                    stroke="var(--color-chart-grid)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                <circle
                  cx={x(index)}
                  cy={y(point.value)}
                  r={active === index ? 5.5 : 4}
                  fill="var(--color-chart-series)"
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                  className="transition-[r] duration-150 motion-reduce:transition-none"
                />
                {/* A hit target far bigger than the 8px marker, so pointing roughly works. */}
                <rect
                  x={x(index) - plotW / points.length / 2}
                  y={PAD_T}
                  width={plotW / points.length}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setActive(index)}
                />
                {index % labelEvery === 0 && (
                  <text
                    x={x(index)}
                    y={VIEW_H - 10}
                    textAnchor="middle"
                    className="fill-muted"
                    style={{ fontSize: 11 }}
                  >
                    {point.label}
                  </text>
                )}
              </g>
            ))}
          </svg>

          {activePoint && (
            <div
              className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs shadow-sm"
              role="status"
            >
              <p className="font-semibold text-foreground">{activePoint.fullLabel ?? activePoint.label}</p>
              <p className="text-foreground-secondary">
                {seriesLabel}: <span className="font-semibold text-foreground">{activePoint.value}</span>
              </p>
            </div>
          )}
        </div>
      </figure>

      <div>
        <button
          type="button"
          onClick={() => setShowTable((open) => !open)}
          aria-expanded={showTable}
          aria-controls={tableId}
          className="rounded text-xs font-semibold text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {tableLabel}
        </button>
        <div id={tableId} hidden={!showTable} className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              <tr>
                <th scope="col" className="py-1 pr-4">
                  {seriesLabel}
                </th>
                <th scope="col" className="py-1">
                  {valueLabel}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {points.map((point) => (
                <tr key={point.label}>
                  <th scope="row" className="py-1 pr-4 font-normal text-foreground-secondary">
                    {point.fullLabel ?? point.label}
                  </th>
                  <td className="py-1 font-semibold text-foreground">{point.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/** Rounds the axis top up to a readable step so gridlines land on whole numbers. */
function niceMax(value: number): number {
  if (value <= 0) return GRID_LINES
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = magnitude * (value / magnitude <= 2 ? 0.5 : value / magnitude <= 5 ? 1 : 2)
  return Math.ceil(value / (step * GRID_LINES)) * step * GRID_LINES
}

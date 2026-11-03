import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

/** Gráficos SVG livianos y táctiles: un solo eje, marcas finas, tooltip al tocar o pasar, vista de tabla. */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.floor(e!.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function Frame({ title, children, table, legend }: { title?: ReactNode; children: ReactNode; table: ReactNode; legend?: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        {title ? <h3 style={{ margin: 0 }}>{title}</h3> : null}
        <span className="spacer" />
        <div className="seg" role="group" aria-label="Vista">
          <button aria-pressed={!asTable} onClick={() => setAsTable(false)}>Gráfico</button>
          <button aria-pressed={asTable} onClick={() => setAsTable(true)}>Tabla</button>
        </div>
      </div>
      {legend}
      {asTable ? <div className="table-wrap">{table}</div> : children}
    </div>
  );
}

export interface Series {
  name: string;
  color: string; // var(--series-n)
  points: Array<{ x: number; y: number | null }>;
  dashed?: boolean;
}

export function LineChart({
  title, series, xFormat, yFormat, refLines = [], height = 240, xTicks = 5,
}: {
  title?: ReactNode;
  series: Series[];
  xFormat: (x: number) => string;
  yFormat: (y: number) => string;
  refLines?: Array<{ y: number; label: string }>;
  height?: number;
  xTicks?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 56, r: 16, t: 12, b: 28 };
  const all = series.flatMap((s) => s.points);
  const xs = all.map((p) => p.x);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const yMax = niceMax(Math.max(0, ...all.map((p) => p.y ?? 0), ...refLines.map((r) => r.y)));
  const sx = (x: number) => pad.l + (x1 === x0 ? 0.5 : (x - x0) / (x1 - x0)) * (width - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - y / yMax) * (height - pad.t - pad.b);
  const uniqueX = useMemo(() => [...new Set(xs)].sort((a, b) => a - b), [series]);

  if (!all.length) return <Frame title={title} table={null}><p className="note">Sin datos todavía.</p></Frame>;

  const path = (s: Series) => {
    let d = "";
    let pen = false;
    for (const p of s.points) {
      if (p.y === null) { pen = false; continue; }
      d += `${pen ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let best = uniqueX[0]!;
    for (const x of uniqueX) if (Math.abs(sx(x) - px) < Math.abs(sx(best) - px)) best = x;
    setHover(best);
  };
  const ticks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);
  const xt = uniqueX.length <= xTicks ? uniqueX : Array.from({ length: xTicks }, (_, i) => uniqueX[Math.round((i * (uniqueX.length - 1)) / (xTicks - 1))]!);
  const legend = series.length >= 2 || refLines.length ? (
    <div className="legend">
      {series.map((s) => <span key={s.name}><i style={{ background: s.color }} className={s.dashed ? "dash" : ""} />{s.name}</span>)}
      {refLines.map((r) => <span key={r.label}><i className="dash" />{r.label}</span>)}
    </div>
  ) : null;
  const table = (
    <table>
      <thead><tr><th>Fecha</th>{series.map((s) => <th key={s.name} className="num">{s.name}</th>)}</tr></thead>
      <tbody>
        {uniqueX.map((x) => (
          <tr key={x}><td>{xFormat(x)}</td>{series.map((s) => { const p = s.points.find((q) => q.x === x); return <td key={s.name} className="num">{p?.y === null || p?.y === undefined ? "—" : yFormat(p.y)}</td>; })}</tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <Frame title={title} table={table} legend={legend}>
      <div className="chart" ref={ref}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={typeof title === "string" ? title : "gráfico"}>
          <g className="axis">
            {ticks.map((t) => (
              <g key={t}>
                <line className="gridline" x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} />
                <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end">{yFormat(t)}</text>
              </g>
            ))}
            {xt.map((x) => <text key={x} x={sx(x)} y={height - 8} textAnchor="middle">{xFormat(x)}</text>)}
          </g>
          {refLines.map((r) => (
            <g key={r.label}>
              <line x1={pad.l} x2={width - pad.r} y1={sy(r.y)} y2={sy(r.y)} stroke="var(--text-muted)" strokeDasharray="4 3" strokeWidth={1.5} />
              <text x={width - pad.r} y={sy(r.y) - 6} textAnchor="end" fill="var(--text-secondary)" fontSize={12}>{r.label}</text>
            </g>
          ))}
          {series.map((s) => <path key={s.name} d={path(s)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "6 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />)}
          {series.length <= 4 && series.map((s) => {
            const last = [...s.points].reverse().find((p) => p.y !== null);
            return last && series.length > 1 ? <text key={s.name} x={Math.min(sx(last.x) + 6, width - pad.r)} y={sy(last.y!) - 6} fontSize={12} fill="var(--text-secondary)" textAnchor={sx(last.x) > width - 80 ? "end" : "start"}>{s.name}</text> : null;
          })}
          {hover !== null && (
            <g>
              <line x1={sx(hover)} x2={sx(hover)} y1={pad.t} y2={height - pad.b} stroke="var(--text-muted)" strokeWidth={1} />
              {series.map((s) => { const p = s.points.find((q) => q.x === hover); return p && p.y !== null ? <circle key={s.name} cx={sx(hover)} cy={sy(p.y)} r={5} fill={s.color} stroke="var(--surface-1)" strokeWidth={2} /> : null; })}
            </g>
          )}
          <rect x={pad.l} y={0} width={width - pad.l - pad.r} height={height} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
        {hover !== null && (
          <div className="tip" style={{ left: Math.min(Math.max(sx(hover) - 80, 0), width - 180), top: 0 }}>
            <div className="muted">{xFormat(hover)}</div>
            {series.map((s) => { const p = s.points.find((q) => q.x === hover); return <div key={s.name}><i style={{ display: "inline-block", width: 10, height: 3, background: s.color, marginRight: 6, verticalAlign: "middle" }} />{s.name}: <b>{p?.y === null || p?.y === undefined ? "—" : yFormat(p.y)}</b></div>; })}
          </div>
        )}
      </div>
    </Frame>
  );
}

export function BarChart({
  title, bars, yFormat, refLine, height = 220, color = "var(--series-1)", partialNote = "parcial",
}: {
  title?: ReactNode;
  bars: Array<{ label: string; value: number | null; partial?: boolean; detail?: string }>;
  yFormat: (y: number) => string;
  refLine?: { y: number; label: string };
  height?: number;
  color?: string;
  partialNote?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const hatchId = `hatch${useId().replace(/:/g, "")}`;
  const pad = { l: 56, r: 12, t: 12, b: 28 };
  const yMax = niceMax(Math.max(0, ...bars.map((b) => b.value ?? 0), refLine?.y ?? 0));
  const n = bars.length || 1;
  const slot = (width - pad.l - pad.r) / n;
  const bw = Math.max(2, Math.min(36, slot - 2)); // 2px de separación entre barras
  const sy = (y: number) => pad.t + (1 - y / yMax) * (height - pad.t - pad.b);
  const base = sy(0);
  const ticks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);
  const every = Math.ceil(n / Math.max(2, Math.floor((width - pad.l) / 70)));
  const table = (
    <table>
      <thead><tr><th>Periodo</th><th className="num">Valor</th></tr></thead>
      <tbody>{bars.map((b) => <tr key={b.label}><td>{b.label}{b.partial ? ` (${partialNote})` : ""}</td><td className="num">{b.value === null ? "—" : yFormat(b.value)}</td></tr>)}</tbody>
    </table>
  );
  if (!bars.length) return <Frame title={title} table={null}><p className="note">Sin datos todavía.</p></Frame>;
  return (
    <Frame title={title} table={table} legend={bars.some((b) => b.partial) || refLine ? (
      <div className="legend">
        {bars.some((b) => b.partial) && <span><i style={{ background: `repeating-linear-gradient(45deg, ${color} 0 2px, transparent 2px 5px)`, height: 10 }} />Día en curso (parcial)</span>}
        {refLine && <span><i className="dash" />{refLine.label}</span>}
      </div>
    ) : undefined}>
      <div className="chart" ref={ref}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={typeof title === "string" ? title : "gráfico de barras"}>
          <defs>
            <pattern id={hatchId} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="2" height="5" fill={color} />
            </pattern>
          </defs>
          <g className="axis">
            {ticks.map((t) => (
              <g key={t}>
                <line className="gridline" x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} />
                <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end">{yFormat(t)}</text>
              </g>
            ))}
            {bars.map((b, i) => (i % every === 0 ? <text key={b.label} x={pad.l + slot * i + slot / 2} y={height - 8} textAnchor="middle">{b.label}</text> : null))}
          </g>
          {bars.map((b, i) => {
            if (b.value === null || b.value <= 0) return null;
            const x = pad.l + slot * i + (slot - bw) / 2;
            const y = sy(b.value);
            const h = base - y;
            const r = Math.min(4, bw / 2, h);
            const d = `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${base} Z`;
            return <path key={b.label} d={d} fill={b.partial ? `url(#${hatchId})` : color} stroke={b.partial ? color : "none"} strokeWidth={b.partial ? 1 : 0} opacity={hover === null || hover === i ? 1 : 0.55} />;
          })}
          {refLine && (
            <g>
              <line x1={pad.l} x2={width - pad.r} y1={sy(refLine.y)} y2={sy(refLine.y)} stroke="var(--text-muted)" strokeDasharray="4 3" strokeWidth={1.5} />
              <text x={width - pad.r} y={sy(refLine.y) - 6} textAnchor="end" fill="var(--text-secondary)" fontSize={12}>{refLine.label}</text>
            </g>
          )}
          {bars.map((b, i) => (
            <rect key={`h${b.label}`} x={pad.l + slot * i} y={pad.t} width={slot} height={height - pad.t - pad.b} fill="transparent"
              onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} onPointerLeave={() => setHover(null)} />
          ))}
        </svg>
        {hover !== null && bars[hover] && (
          <div className="tip" style={{ left: Math.min(Math.max(pad.l + slot * hover - 60, 0), width - 170), top: 0 }}>
            <div className="muted">{bars[hover]!.label}{bars[hover]!.partial ? ` · ${partialNote}` : ""}</div>
            <b>{bars[hover]!.value === null ? "—" : yFormat(bars[hover]!.value!)}</b>
            {bars[hover]!.detail ? <div className="muted">{bars[hover]!.detail}</div> : null}
          </div>
        )}
      </div>
    </Frame>
  );
}

/** Barras horizontales para rankings (campañas, anuncios, variantes). */
export function HBars({ rows, format }: { rows: Array<{ label: string; value: number; sub?: string }>; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="note">Sin datos todavía.</p>;
  return (
    <div className="list">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
            <b style={{ fontVariantNumeric: "tabular-nums" }}>{format(r.value)}</b>
          </div>
          {r.sub ? <div className="note">{r.sub}</div> : null}
          <div className="bar"><i style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

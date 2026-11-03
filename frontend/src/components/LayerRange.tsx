interface Props {
  max: number;
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}

/** Dos deslizadores: capa inferior y superior del tramo que se muestra. */
export function LayerRange({ max, from, to, onChange }: Props) {
  return (
    <div className="layer-range">
      <label>
        Desde capa Y: {from}
        <input
          type="range"
          min={0}
          max={max}
          value={from}
          onChange={(e) => onChange(Math.min(Number(e.target.value), to), to)}
        />
      </label>
      <label>
        Hasta capa Y: {to}
        <input
          type="range"
          min={0}
          max={max}
          value={to}
          onChange={(e) => onChange(from, Math.max(Number(e.target.value), from))}
        />
      </label>
    </div>
  );
}

interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
}

/** Deslizador de capa Y con botones para subir (capa superior) y bajar (capa inferior) de una en una. */
export function LayerStepper({ value, max, onChange }: Props) {
  return (
    <div className="layer-stepper">
      <span className="layer-label">Capa Y: {value} / {max}</span>
      <div className="layer-controls">
        <button
          type="button"
          className="button"
          aria-label="Bajar a la capa inferior"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
        >
          ▼
        </button>
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          aria-label="Capa Y"
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <button
          type="button"
          className="button"
          aria-label="Subir a la capa superior"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          ▲
        </button>
      </div>
    </div>
  );
}

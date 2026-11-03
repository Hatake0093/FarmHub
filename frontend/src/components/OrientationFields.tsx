import { composeState, currentState, stateOptions } from "../lib/blockStates";
import { baseBlock } from "../lib/blockShapes";

interface Props {
  block: string;
  onChange: (block: string) => void;
}

/** Selectores de orientación y forma del bloque del pincel, para los bloques que las tienen. */
export function OrientationFields({ block, onChange }: Props) {
  const options = stateOptions(block);
  if (options.length === 0) return null;

  const base = baseBlock(block);
  const props = currentState(block);

  return (
    <fieldset className="orientation-fields">
      <legend>Orientación del bloque</legend>
      {options.map((option) => {
        const value = props[option.name] ?? option.values[0].value;
        return (
          <label key={option.name}>
            {option.label}
            <select
              value={value}
              onChange={(e) => onChange(composeState(base, { ...props, [option.name]: e.target.value }))}
            >
              {option.values.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </label>
        );
      })}
    </fieldset>
  );
}

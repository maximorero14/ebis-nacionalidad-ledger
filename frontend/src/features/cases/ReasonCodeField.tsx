import { useEffect, useState } from "react";
import { Select } from "../../design-system/components/Select";
import { TextField } from "../../design-system/components/TextField";
import { REASON_CODE_CATALOG, type ReasonCodeValue } from "./reasonCodes";

interface ReasonCodeFieldProps {
  onChange: (reasonCode: string) => void;
}

/**
 * Resolves to a preset's value, or the free-text alternative when "otro" is selected.
 * See reasonCodes.ts for why a fixed catalog matters here (the backend hashes this text).
 */
export function ReasonCodeField({ onChange }: ReasonCodeFieldProps) {
  const [preset, setPreset] = useState<ReasonCodeValue>(REASON_CODE_CATALOG[0].value);
  const [customText, setCustomText] = useState("");

  // A native <select> never fires onChange for the value it already renders with, so the
  // parent (which starts with an empty reasonCode) would never learn the default preset
  // unless the user happens to touch the field — found live: the submit button stayed
  // disabled even though a reason was visibly selected. Callers pass a useState setter
  // here, which React guarantees is referentially stable, so this only runs once.
  useEffect(() => {
    onChange(REASON_CODE_CATALOG[0].value);
  }, [onChange]);

  function handlePresetChange(value: string) {
    const nextPreset = value as ReasonCodeValue;
    setPreset(nextPreset);
    onChange(nextPreset === "otro" ? customText : nextPreset);
  }

  function handleCustomTextChange(value: string) {
    setCustomText(value);
    onChange(value);
  }

  return (
    <>
      <Select
        label="Motivo"
        value={preset}
        onChange={(event) => {
          handlePresetChange(event.target.value);
        }}
      >
        {REASON_CODE_CATALOG.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {preset === "otro" ? (
        <TextField
          label="Especificar motivo"
          value={customText}
          onChange={(event) => {
            handleCustomTextChange(event.target.value);
          }}
          required
        />
      ) : null}
    </>
  );
}

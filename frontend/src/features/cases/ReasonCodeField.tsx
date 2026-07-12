import { useEffect, useState } from "react";
import { Select } from "../../design-system/components/Select";
import type { ReasonCodeOption } from "./reasonCodes";

interface ReasonCodeFieldProps {
  codes: readonly ReasonCodeOption[];
  onChange: (reasonCode: string) => void;
}

/**
 * A closed list only — no free-text escape hatch. See reasonCodes.ts for why: these
 * codes are hashed and committed on-chain permanently, and docs/FUNCIONAL.md requires
 * them to stay within a fixed, non-sensitive catalog.
 */
export function ReasonCodeField({ codes, onChange }: ReasonCodeFieldProps) {
  const [selected, setSelected] = useState<string>(codes[0].value);

  // A native <select> never fires onChange for the value it already renders with, so the
  // parent (which starts with an empty reasonCode) would never learn the default option
  // unless the user happens to touch the field — found live in M7.3: the submit button
  // stayed disabled even though a reason was visibly selected. Callers pass a useState
  // setter here, which React guarantees is referentially stable, so this only runs once.
  useEffect(() => {
    onChange(codes[0].value);
  }, [codes, onChange]);

  return (
    <Select
      label="Motivo"
      value={selected}
      onChange={(event) => {
        setSelected(event.target.value);
        onChange(event.target.value);
      }}
    >
      {codes.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

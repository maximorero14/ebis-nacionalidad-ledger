import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import styles from "./Select.module.css";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function Select({ label, id, className, children, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={styles["field"]}>
      <label className={styles["label"]} htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        className={[styles["select"], className].filter(Boolean).join(" ")}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}

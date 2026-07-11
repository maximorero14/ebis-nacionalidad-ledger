import { useId, type InputHTMLAttributes } from "react";
import styles from "./TextField.module.css";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  errorMessage?: string | undefined;
}

export function TextField({ label, errorMessage, id, className, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = errorMessage ? `${inputId}-error` : undefined;

  return (
    <div className={styles["field"]}>
      <label className={styles["label"]} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={[styles["input"], errorMessage ? styles["error"] : "", className]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={errorId}
        {...rest}
      />
      {errorMessage ? (
        <span id={errorId} className={styles["errorText"]} role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

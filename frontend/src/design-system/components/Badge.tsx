import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "info" | "success" | "danger" | "warning";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

/** Always renders as text: status must never be conveyed by color alone (M7.7). */
export function Badge({ tone = "neutral", children }: BadgeProps) {
  return <span className={`${styles["badge"]} ${styles[tone]}`}>{children}</span>;
}

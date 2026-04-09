import React from "react";
import { TOKENS } from "../../design-system/tokens";

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function ScreenContainer({ children, style }: ScreenContainerProps) {
  return <div style={{ display: "grid", gap: TOKENS.spacing.lg, ...style }}>{children}</div>;
}

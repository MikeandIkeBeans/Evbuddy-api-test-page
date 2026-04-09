import React from "react";
import { TOKENS } from "../../design-system/tokens";

type PanelVariant = "card" | "dark";

interface PanelProps {
  children: React.ReactNode;
  variant?: PanelVariant;
  style?: React.CSSProperties;
}

const variants: Record<PanelVariant, React.CSSProperties> = {
  card: {
    background: TOKENS.color.surface.card,
    border: `1px solid ${TOKENS.color.line.soft}`,
    borderRadius: 18,
    boxShadow: "var(--shadow-soft)",
    padding: 22,
    marginBottom: 18,
  },
  dark: {
    background: TOKENS.color.surface.panel,
    border: `1px solid ${TOKENS.color.line.soft}`,
    borderRadius: 12,
    padding: 16,
  },
};

export default function Panel({ children, variant = "card", style }: PanelProps) {
  return <div style={{ ...variants[variant], ...style }}>{children}</div>;
}

import React from "react";
import { TOKENS } from "../../design-system/tokens";

type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  style?: React.CSSProperties;
}

const toneStyle: Record<BadgeTone, React.CSSProperties> = {
  success: {
    background: TOKENS.color.semantic.success.soft,
    color: TOKENS.color.semantic.success.strong,
    borderColor: TOKENS.color.semantic.success.line,
  },
  warning: {
    background: TOKENS.color.semantic.warning.soft,
    color: TOKENS.color.semantic.warning.strong,
    borderColor: TOKENS.color.semantic.warning.line,
  },
  error: {
    background: TOKENS.color.semantic.error.soft,
    color: TOKENS.color.semantic.error.strong,
    borderColor: TOKENS.color.semantic.error.line,
  },
  info: {
    background: TOKENS.color.semantic.info.soft,
    color: TOKENS.color.semantic.info.strong,
    borderColor: TOKENS.color.semantic.info.line,
  },
  neutral: {
    background: TOKENS.color.semantic.neutral.soft,
    color: TOKENS.color.semantic.neutral.strong,
    borderColor: TOKENS.color.semantic.neutral.line,
  },
};

export default function Badge({ children, tone = "neutral", style }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid transparent",
        ...toneStyle[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}



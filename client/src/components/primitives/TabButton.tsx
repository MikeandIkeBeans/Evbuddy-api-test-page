import React from "react";
import { TOKENS } from "../../design-system/tokens";

interface TabButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export default function TabButton({ active = false, style, children, ...rest }: TabButtonProps) {
  return (
    <button
      style={{
        padding: "10px 16px",
        borderRadius: 12,
        border: active ? `1px solid ${TOKENS.color.line.strong}` : "1px solid transparent",
        background: active ? TOKENS.color.status.selectedBg : "transparent",
        color: active ? TOKENS.color.status.selectedText : TOKENS.color.status.unselectedText,
        boxShadow: active
          ? "inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 10px 24px rgba(0, 26, 21, 0.48)"
          : "none",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        position: "relative",
        overflow: "hidden",
        transition: TOKENS.motion.fast,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}



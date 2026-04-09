import React from "react";
import { TOKENS } from "../../design-system/tokens";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export default function Chip({ selected = false, style, children, ...rest }: ChipProps) {
  return (
    <button
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: selected
          ? `1px solid ${TOKENS.color.line.strong}`
          : `1px solid ${TOKENS.color.line.soft}`,
        background: selected
          ? TOKENS.color.status.selectedBg
          : TOKENS.color.status.unselectedBg,
        color: selected
          ? TOKENS.color.status.selectedText
          : TOKENS.color.status.unselectedText,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        transition: TOKENS.motion.fast,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}



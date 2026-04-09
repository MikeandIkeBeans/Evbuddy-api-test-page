import React from "react";
import { TOKENS } from "../../design-system/tokens";

interface SectionHeaderProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  subtitle?: React.ReactNode;
}

export default function SectionHeader({ title, icon, action, subtitle }: SectionHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: TOKENS.type.title.fontSize,
            fontWeight: TOKENS.type.title.fontWeight,
            letterSpacing: TOKENS.type.title.letterSpacing,
            color: TOKENS.color.text.primary,
            textTransform: "uppercase",
          }}
        >
          {icon}
          {title}
        </div>
        {subtitle ? <div style={{ color: TOKENS.color.text.muted, fontSize: 12 }}>{subtitle}</div> : null}
      </div>
      {action}
    </div>
  );
}

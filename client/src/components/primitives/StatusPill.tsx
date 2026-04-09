import React from "react";
import Badge from "./Badge";

type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

interface StatusPillProps {
  label: React.ReactNode;
  tone?: StatusTone;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function StatusPill({ label, tone = "neutral", icon, style }: StatusPillProps) {
  return (
    <Badge tone={tone} style={style}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {icon}
        {label}
      </span>
    </Badge>
  );
}

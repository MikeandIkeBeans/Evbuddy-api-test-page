import React from "react";

export const TOKENS = {
  color: {
    brand: {
      bgAnchor: "#002F27",
      primaryAccent: "#44B5A1",
      secondaryFilled: "#215F55",
      textOnDark: "#FFFFFF",
    },
    semantic: {
      success: {
        strong: "var(--semantic-success)",
        soft: "var(--semantic-success-soft)",
        line: "var(--semantic-success-line)",
      },
      warning: {
        strong: "var(--semantic-warning)",
        soft: "var(--semantic-warning-soft)",
        line: "var(--semantic-warning-line)",
      },
      error: {
        strong: "var(--semantic-error)",
        soft: "var(--semantic-error-soft)",
        line: "var(--semantic-error-line)",
      },
      info: {
        strong: "var(--semantic-info)",
        soft: "var(--semantic-info-soft)",
        line: "var(--semantic-info-line)",
      },
      neutral: {
        strong: "var(--semantic-neutral)",
        soft: "var(--semantic-neutral-soft)",
        line: "var(--semantic-neutral-line)",
      },
    },
    text: {
      primary: "var(--text-primary)",
      secondary: "var(--text-secondary)",
      muted: "var(--text-muted)",
    },
    surface: {
      card: "var(--surface-card)",
      panel: "var(--surface-panel)",
      elevated: "var(--surface-elevated)",
    },
    line: {
      soft: "var(--line-soft)",
      strong: "var(--line-strong)",
      focus: "var(--line-focus)",
    },
    status: {
      selectedBg: "rgba(68, 181, 161, 0.28)",
      selectedText: "var(--text-primary)",
      unselectedBg: "var(--surface-panel)",
      unselectedText: "var(--text-muted)",
      disabledBg: "rgba(33, 95, 85, 0.22)",
      disabledText: "rgba(255, 255, 255, 0.46)",
      loadingBg: "rgba(33, 95, 85, 0.38)",
      loadingText: "var(--text-secondary)",
    },
  },
  radius: {
    sm: 8,
    md: 10,
    lg: 12,
    xl: 16,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  type: {
    title: {
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: "0.02em",
    },
    label: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.08em",
    },
    button: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: "0.03em",
      textTransform: "uppercase" as React.CSSProperties["textTransform"],
    },
  },
  motion: {
    fast: "all 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
    normal: "all 0.24s cubic-bezier(0.22, 1, 0.36, 1)",
  },
};

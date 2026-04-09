import React from "react";
import { TOKENS } from "../../design-system/tokens";

type ButtonVariant = "primary" | "secondary" | "outline" | "destructive";
type ButtonState = "default" | "loading";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  state?: ButtonState;
}

const baseStyle: React.CSSProperties = {
  borderRadius: TOKENS.radius.md,
  padding: "8px 14px",
  cursor: "pointer",
  border: "1px solid transparent",
  fontSize: TOKENS.type.button.fontSize,
  fontWeight: TOKENS.type.button.fontWeight,
  letterSpacing: TOKENS.type.button.letterSpacing,
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: TOKENS.color.brand.primaryAccent,
    color: TOKENS.color.brand.bgAnchor,
    borderColor: TOKENS.color.line.focus,
    textTransform: TOKENS.type.button.textTransform,
  },
  secondary: {
    background: TOKENS.color.brand.secondaryFilled,
    color: TOKENS.color.brand.textOnDark,
    borderColor: TOKENS.color.line.strong,
  },
  outline: {
    background: "transparent",
    color: TOKENS.color.brand.primaryAccent,
    borderColor: TOKENS.color.line.strong,
  },
  destructive: {
    background: TOKENS.color.semantic.error.strong,
    color: TOKENS.color.brand.textOnDark,
    borderColor: TOKENS.color.semantic.error.line,
    fontWeight: 800,
  },
};

const stateStyles: Record<ButtonState, React.CSSProperties> = {
  default: {},
  loading: {
    background: TOKENS.color.status.loadingBg,
    color: TOKENS.color.status.loadingText,
  },
};

export default function Button({
  variant = "primary",
  state = "default",
  style,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const finalDisabled = disabled || state === "loading";
  return (
    <button
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...stateStyles[state],
        ...(finalDisabled
          ? {
              background: TOKENS.color.status.disabledBg,
              color: TOKENS.color.status.disabledText,
              borderColor: TOKENS.color.line.soft,
            }
          : {}),
        ...style,
      }}
      disabled={finalDisabled}
      {...rest}
    >
      {children}
    </button>
  );
}



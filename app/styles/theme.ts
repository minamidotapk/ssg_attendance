export const tailwindThemeTokens = {
  colors: {
    main: "#075b6b",
    bg: "var(--bg)",
    bgLight: "var(--bg-light)",
    text: "var(--text)",
    textMuted: "var(--text-muted)",
    highlight: "var(--highlight)",
    border: "var(--border)",
    borderMuted: "var(--border-muted)",
    primary: "var(--primary)",
    secondary: "var(--secondary)",
    danger: "var(--danger)",
    warning: "var(--warning)",
    success: "var(--success)",
    info: "var(--info)",
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  borderRadius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  },
} as const

export type TailwindThemeTokens = typeof tailwindThemeTokens

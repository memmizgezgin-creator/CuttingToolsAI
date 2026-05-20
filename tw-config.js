// ToolAdvisor — shared Tailwind config
// Loaded BEFORE the Tailwind Play CDN script on every page.
// Single source of truth for color palette, type scale, spacing.
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary brand
        "primary":                       "#123356",
        "primary-container":             "#2c4a6e",
        "primary-fixed":                 "#d3e4ff",
        "primary-fixed-dim":             "#abc9f3",
        "on-primary":                    "#ffffff",
        "on-primary-container":          "#9cbae4",
        "on-primary-fixed":              "#001c38",
        "on-primary-fixed-variant":      "#2a486c",
        "inverse-primary":               "#abc9f3",
        "surface-tint":                  "#436085",

        // Secondary (warm amber accent)
        "secondary":                     "#735b28",
        "secondary-container":           "#fedb9c",
        "secondary-fixed":               "#ffdea3",
        "secondary-fixed-dim":           "#e3c285",
        "on-secondary":                  "#ffffff",
        "on-secondary-container":        "#785f2b",
        "on-secondary-fixed":            "#261900",
        "on-secondary-fixed-variant":    "#594312",

        // Tertiary (neutral support)
        "tertiary":                      "#313332",
        "tertiary-container":            "#484948",
        "tertiary-fixed":                "#e3e2e0",
        "tertiary-fixed-dim":            "#c7c6c5",
        "on-tertiary":                   "#ffffff",
        "on-tertiary-container":         "#b8b8b6",
        "on-tertiary-fixed":             "#1a1c1b",
        "on-tertiary-fixed-variant":     "#464746",

        // Error
        "error":                         "#ba1a1a",
        "error-container":               "#ffdad6",
        "on-error":                      "#ffffff",
        "on-error-container":            "#93000a",

        // Surfaces
        "background":                    "#faf9fc",
        "surface":                       "#faf9fc",
        "surface-bright":                "#faf9fc",
        "surface-dim":                   "#dad9dd",
        "surface-card":                  "#FFFFFF",
        "surface-variant":               "#e3e2e5",
        "surface-container-lowest":      "#ffffff",
        "surface-container-low":         "#f4f3f6",
        "surface-container":             "#eeedf1",
        "surface-container-high":        "#e9e8eb",
        "surface-container-highest":     "#e3e2e5",
        "inverse-surface":               "#2f3033",
        "inverse-on-surface":            "#f1f0f4",
        "on-background":                 "#1a1c1e",
        "on-surface":                    "#1a1c1e",
        "on-surface-variant":            "#43474e",
        "outline":                       "#73777f",
        "outline-variant":               "#c3c6cf",

        // Warm catalog accents
        "sidebar-bg":                    "#F5F2EE",
        "border-warm":                   "#E8E4DE",
        "skeleton-shimmer":              "#F0EDE8",
        "ink-text":                      "#1A1A2E",
        "glass-backdrop":                "rgba(26, 26, 46, 0.5)",

        // ISO material-group encoding
        "iso-p-blue":                    "#3B82F6",
        "iso-m-amber":                   "#F59E0B",
        "iso-k-red":                     "#EF4444",
        "iso-n-green":                   "#10B981",
        "iso-s-orange":                  "#F97316",
        "iso-h-slate":                   "#64748B",
      },

      borderRadius: {
        "DEFAULT":  "0.25rem",
        "lg":       "0.5rem",
        "xl":       "0.75rem",
        "full":     "9999px",
      },

      spacing: {
        "gutter":            "24px",
        "card-padding":      "20px",
        "container-margin":  "32px",
        "sidebar-width":     "260px",   // matches page-switcher.js injected aside
        "stack-gap-sm":      "8px",
        "stack-gap-md":      "16px",
        "stack-gap-lg":      "24px",
      },

      fontFamily: {
        "display-hero":     ["Nunito"],
        "section-heading":  ["Nunito"],
        "product-grade":    ["Nunito"],
        "nav-item":         ["Nunito"],
        "body-lg":          ["DM Sans"],
        "body-md":          ["DM Sans"],
        "label-caps":       ["DM Sans"],
        "technical-data":   ["DM Mono"],
      },

      fontSize: {
        "label-caps":       ["13px", { "lineHeight": "1.0",  "letterSpacing": "0.06em",  "fontWeight": "600" }],
        "nav-item":         ["15px", { "lineHeight": "1.0",                              "fontWeight": "500" }],
        "section-heading":  ["28px", { "lineHeight": "1.3",                              "fontWeight": "700" }],
        "technical-data":   ["14px", { "lineHeight": "1.4",                              "fontWeight": "500" }],
        "body-md":          ["17px", { "lineHeight": "1.7",                              "fontWeight": "400" }],
        "body-lg":          ["19px", { "lineHeight": "1.7",                              "fontWeight": "400" }],
        "product-grade":    ["24px", { "lineHeight": "1.2",                              "fontWeight": "700" }],
        "display-hero":     ["36px", { "lineHeight": "1.2",  "letterSpacing": "-0.02em", "fontWeight": "800" }],
      },
    },
  },
};

export const TOKENS = {
  bg: "#0c0c0c",
  bgRaised: "#141311",
  fg: "#f0ede6",
  fgDim: "#6e6b64",
  fgMid: "#a09c94",
  accent: "#d4ff50",
  accentSoft: "rgba(212,255,80,0.12)",
  sunday: "#e0645c",
  saturday: "#5c9ce0",
  danger: "#ff9b8f",
  rule: "rgba(240,237,230,0.12)",
  fontDisplay: "'Barlow Condensed', sans-serif",
  fontBody: "'Instrument Sans', sans-serif",
};

const COLOR_SCHEMES = {
  dark: {
    bg: "#0c0c0c",
    bgRaised: "#141311",
    fg: "#f0ede6",
    fgDim: "#6e6b64",
    fgMid: "#a09c94",
    accent: "#d4ff50",
    accentSoft: "rgba(212,255,80,0.12)",
    sunday: "#e0645c",
    saturday: "#5c9ce0",
    danger: "#ff9b8f",
    rule: "rgba(240,237,230,0.12)",
  },
  light: {
    bg: "#f4f2ea",
    bgRaised: "#eae7dc",
    fg: "#25271f",
    fgDim: "#68695d",
    fgMid: "#4d5045",
    accent: "#687f20",
    accentSoft: "rgba(104,127,32,0.14)",
    sunday: "#b5473f",
    saturday: "#356b9a",
    danger: "#a83228",
    rule: "rgba(37,39,31,0.14)",
  },
};

export function setColorScheme(scheme) {
  const activeScheme = scheme === "light" ? "light" : "dark";
  Object.assign(TOKENS, COLOR_SCHEMES[activeScheme]);
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.style.setProperty("--bg", TOKENS.bg);
    root.style.setProperty("--fg", TOKENS.fg);
    root.style.setProperty("--fg-dim", TOKENS.fgDim);
    root.style.setProperty("--fg-mid", TOKENS.fgMid);
    root.style.setProperty("--accent", TOKENS.accent);
    root.style.setProperty("--rule", TOKENS.rule);
    root.style.colorScheme = activeScheme;
    document.body.style.backgroundColor = TOKENS.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", TOKENS.bg);
  }
}

export const FEELINGS = {
  hot: { label: "더웠음", symbol: "▲" },
  normal: { label: "적당함", symbol: "—" },
  cold: { label: "추웠음", symbol: "▼" },
};

export const TOKENS = {
  bg: "#0c0c0c",
  bgRaised: "#141311",
  fg: "#f0ede6",
  fgDim: "#6e6b64",
  fgMid: "#a09c94",
  accent: "#d4ff50",
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
    sunday: "#e0645c",
    saturday: "#5c9ce0",
    danger: "#ff9b8f",
    rule: "rgba(240,237,230,0.12)",
  },
  light: {
    bg: "#f0ede6",
    bgRaised: "#e7e3da",
    fg: "#0c0c0c",
    fgDim: "#6e6b64",
    fgMid: "#54514b",
    accent: "#5d7412",
    sunday: "#b83d37",
    saturday: "#28639a",
    danger: "#b42318",
    rule: "rgba(12,12,12,0.14)",
  },
};

export function setColorScheme(scheme) {
  Object.assign(TOKENS, COLOR_SCHEMES[scheme] || COLOR_SCHEMES.dark);
}

export const FEELINGS = {
  hot: { label: "더웠음", symbol: "▲" },
  normal: { label: "적당함", symbol: "—" },
  cold: { label: "추웠음", symbol: "▼" },
};

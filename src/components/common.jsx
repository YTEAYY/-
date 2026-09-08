import { FEELINGS, TOKENS } from "../constants";

export function Eyebrow({ children, style }) {
  return (
    <div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 11, letterSpacing: "0.14em", color: TOKENS.fgDim, textTransform: "uppercase", ...style }}>
      {children}
    </div>
  );
}

export function SectionToggle({ label, count, open, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "none",
        border: "none",
        borderTop: `1px solid ${TOKENS.rule}`,
        padding: "16px 0",
        cursor: "pointer",
      }}
    >
      <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: "0.02em", color: TOKENS.fg }}>
        {label}
        {count != null && <span style={{ fontFamily: TOKENS.fontBody, fontSize: 12, color: TOKENS.fgDim, marginLeft: 8 }}>{count}</span>}
      </span>
      <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 16, color: TOKENS.fg, display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
    </button>
  );
}

export function FeelingMark({ feeling, active, size = 14 }) {
  const feelingMeta = FEELINGS[feeling];
  if (!feelingMeta) return null;
  return (
    <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: size, fontWeight: 700, color: active ? TOKENS.accent : TOKENS.fg, lineHeight: 1 }}>
      {feelingMeta.symbol}
    </span>
  );
}

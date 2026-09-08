import { useState } from "react";
import { TOKENS } from "../constants";
import { CATEGORY_LABEL, CATEGORY_ORDER, WARDROBE_WARMTH } from "../lib/wardrobe";
import { Eyebrow } from "./common";

export default function WardrobeSheet({ wardrobe, onAdd, onRemove, onClose }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("top");
  const [warmth, setWarmth] = useState("mild");
  function handleAdd() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), category, warmth });
    setName("");
  }
  return (
    <div className="ootd-scope" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} style={{ background: TOKENS.bgRaised, borderTop: `1px solid ${TOKENS.rule}`, width: "100%", maxWidth: 430, padding: "22px 22px 30px", maxHeight: "85vh", overflowY: "auto", fontFamily: TOKENS.fontBody, color: TOKENS.fg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}><div><Eyebrow>MY WARDROBE</Eyebrow><div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 24, fontWeight: 700, marginTop: 4 }}>내 옷장</div></div><button onClick={onClose} style={{ background: "none", border: "none", color: TOKENS.fgDim, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }} aria-label="닫기">×</button></div>
        <Eyebrow style={{ marginBottom: 8 }}>옷 추가하기</Eyebrow>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 초록 니트, 청바지" maxLength={30} style={{ width: "100%", background: "none", border: "none", borderBottom: `1px solid ${TOKENS.rule}`, color: TOKENS.fg, padding: "8px 0", fontSize: 14, fontFamily: TOKENS.fontBody, marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>{CATEGORY_ORDER.map((itemCategory) => <button key={itemCategory} onClick={() => setCategory(itemCategory)} style={{ flex: "1 0 30%", padding: "8px 4px", background: category === itemCategory ? TOKENS.accent : "none", color: category === itemCategory ? TOKENS.bg : TOKENS.fgMid, border: `1px solid ${category === itemCategory ? TOKENS.accent : TOKENS.rule}`, fontFamily: TOKENS.fontDisplay, fontSize: 11.5, cursor: "pointer" }}>{CATEGORY_LABEL[itemCategory]}</button>)}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>{Object.entries(WARDROBE_WARMTH).map(([key, meta]) => <button key={key} onClick={() => setWarmth(key)} style={{ flex: 1, padding: "8px 4px", background: warmth === key ? "rgba(212,255,80,0.14)" : "none", color: warmth === key ? TOKENS.fg : TOKENS.fgMid, border: `1px solid ${warmth === key ? TOKENS.accent : TOKENS.rule}`, fontFamily: TOKENS.fontBody, fontSize: 12, cursor: "pointer" }}>{meta.label}</button>)}</div>
        <button onClick={handleAdd} disabled={!name.trim()} style={{ width: "100%", background: name.trim() ? TOKENS.accent : TOKENS.rule, color: name.trim() ? TOKENS.bg : TOKENS.fgDim, border: "none", padding: "12px 0", fontFamily: TOKENS.fontDisplay, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", cursor: name.trim() ? "pointer" : "not-allowed", marginBottom: 22 }}>+ 옷장에 추가</button>
        <Eyebrow style={{ marginBottom: 8 }}>내 옷 목록 ({wardrobe.length})</Eyebrow>
        {wardrobe.length === 0 && <p style={{ fontSize: 12.5, color: TOKENS.fgDim }}>아직 등록된 옷이 없어요.</p>}
        {CATEGORY_ORDER.map((itemCategory) => { const items = wardrobe.filter((item) => item.category === itemCategory); if (!items.length) return null; return <div key={itemCategory} style={{ marginBottom: 14 }}><div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 11, color: TOKENS.fgDim, letterSpacing: "0.04em", marginBottom: 6 }}>{CATEGORY_LABEL[itemCategory]}</div>{items.map((item) => <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${TOKENS.rule}`, padding: "10px 0" }}><div><div style={{ fontSize: 14 }}>{item.name}</div><div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 10.5, color: TOKENS.fgDim, marginTop: 2 }}>{WARDROBE_WARMTH[item.warmth]?.label}</div></div><button onClick={() => onRemove(item.id)} style={{ background: "none", border: "none", color: TOKENS.fgDim, fontSize: 16, cursor: "pointer", padding: 6 }} aria-label="삭제">×</button></div>)}</div>; })}
      </div>
    </div>
  );
}

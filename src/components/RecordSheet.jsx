import { useState } from "react";
import { FEELINGS, TOKENS } from "../constants";
import { fmtTemp } from "../lib/date";
import { Eyebrow } from "./common";

function resizeImageFile(file, maxWidth = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RecordSheet({ dateStr, isToday, weather, existing, unit, onClose, onSave }) {
  const [items, setItems] = useState(existing?.items_worn || "");
  const [feeling, setFeeling] = useState(existing?.feeling || null);
  const [memo, setMemo] = useState(existing?.user_memo || "");
  const [photo, setPhoto] = useState(existing?.photo || null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [year, month, day] = dateStr.split("-");
  const canSave = items.trim().length > 0 && feeling;
  const inputStyle = { width: "100%", background: "none", border: "none", borderBottom: `1px solid ${TOKENS.rule}`, borderRadius: 0, padding: "8px 0", fontSize: 14, fontFamily: TOKENS.fontBody, color: TOKENS.fg, resize: "none", boxSizing: "border-box" };

  async function handlePhotoPick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try { setPhoto(await resizeImageFile(file)); } catch (error) { /* 사진 변환 실패는 기록 저장을 막지 않는다. */ } finally { setPhotoBusy(false); }
  }

  return (
    <div className="ootd-scope" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} style={{ background: TOKENS.bgRaised, borderTop: `1px solid ${TOKENS.rule}`, width: "100%", maxWidth: 430, padding: "22px 22px 30px", maxHeight: "88vh", overflowY: "auto", fontFamily: TOKENS.fontBody, color: TOKENS.fg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}><div><Eyebrow>{year}.{month}.{day} {isToday ? "· 오늘" : ""}</Eyebrow><div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 24, fontWeight: 700, marginTop: 4 }}>{weather?.status === "ok" ? `${fmtTemp(weather.temp, unit)} 기록` : "오늘의 기록"}</div></div><button onClick={onClose} style={{ background: "none", border: "none", color: TOKENS.fgDim, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }} aria-label="닫기">×</button></div>
        <Eyebrow style={{ marginBottom: 8 }}>오늘 뭐 입으셨나요</Eyebrow><textarea value={items} onChange={(event) => setItems(event.target.value)} placeholder="예: 파란 셔츠, 크림진, 뉴발란스 530" rows={2} style={{ ...inputStyle, marginBottom: 24 }} />
        <Eyebrow style={{ marginBottom: 10 }}>사진 (선택)</Eyebrow>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>{photo ? <div style={{ position: "relative" }}><img src={photo} alt="오늘 착장" style={{ width: 72, height: 72, objectFit: "cover", display: "block" }} /><button onClick={() => setPhoto(null)} style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", background: TOKENS.bg, border: `1px solid ${TOKENS.rule}`, color: TOKENS.fg, fontSize: 12, lineHeight: 1, cursor: "pointer" }} aria-label="사진 삭제">×</button></div> : <label style={{ width: 72, height: 72, border: `1px dashed ${TOKENS.rule}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: TOKENS.fgDim, cursor: "pointer" }}>{photoBusy ? "···" : "+"}<input type="file" accept="image/*" onChange={handlePhotoPick} style={{ display: "none" }} /></label>}<span style={{ fontSize: 12, color: TOKENS.fgDim, lineHeight: 1.5 }}>오늘 입은 옷 사진을 남겨두면{"\n"}나중에 기록을 볼 때 더 도움이 돼요.</span></div>
        <Eyebrow style={{ marginBottom: 10 }}>오늘 옷차림은 어떠셨나요</Eyebrow>
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderTop: `1px solid ${TOKENS.rule}`, borderBottom: `1px solid ${TOKENS.rule}` }}>{Object.entries(FEELINGS).map(([key, meta], index) => <button key={key} onClick={() => setFeeling(key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 4px", cursor: "pointer", background: "none", border: "none", borderRight: index < 2 ? `1px solid ${TOKENS.rule}` : "none", borderBottom: feeling === key ? `2px solid ${TOKENS.accent}` : "2px solid transparent" }}><span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 18, fontWeight: 700, color: feeling === key ? TOKENS.accent : TOKENS.fgMid }}>{meta.symbol}</span><span style={{ fontSize: 11.5, fontWeight: 600, color: feeling === key ? TOKENS.fg : TOKENS.fgDim }}>{meta.label}</span></button>)}</div>
        <Eyebrow style={{ marginBottom: 8 }}>한 줄 메모</Eyebrow><textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="예: 강의실 에어컨 바람 때문에 추웠음. 다음엔 바람막이 필수" rows={2} style={{ ...inputStyle, marginBottom: 28 }} />
        <button disabled={!canSave} onClick={() => onSave({ items_worn: items.trim(), feeling, user_memo: memo.trim(), photo: photo || null, temperature: weather?.status === "ok" ? weather.temp : existing?.temperature ?? null, rain_prob: weather?.status === "ok" ? weather.pop : existing?.rain_prob ?? null })} style={{ width: "100%", background: canSave ? TOKENS.accent : "transparent", color: canSave ? TOKENS.bg : TOKENS.fgDim, border: canSave ? "none" : `1px solid ${TOKENS.rule}`, padding: "15px 0", fontFamily: TOKENS.fontDisplay, fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", cursor: canSave ? "pointer" : "not-allowed" }}>저장하기</button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { TOKENS } from "../constants";
import { Eyebrow } from "./common";

export default function ProfileSheet({ existing, onClose, onSave }) {
  const [gender, setGender] = useState(existing.gender || "");
  const [age, setAge] = useState(existing.age || "");
  const [health, setHealth] = useState(existing.health || []);
  const [healthOther, setHealthOther] = useState(existing.healthOther || "");
  const [birthday, setBirthday] = useState(existing.birthday || "");
  const healthOptions = [
    ["respiratory", "호흡기 민감"], ["cardiovascular", "심혈관·혈압 주의"], ["skin", "피부 민감"],
    ["coldSensitive", "추위를 많이 탐"], ["pregnant", "임신 중"], ["other", "기타 (직접 입력)"],
  ];

  function toggleHealth(key) {
    setHealth((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function handleAgeChange(event) {
    const raw = event.target.value;
    setAge(raw === "" ? "" : String(Math.max(1, Math.min(100, Number(raw)))));
  }

  return (
    <div className="ootd-scope" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} style={{ background: TOKENS.bgRaised, borderTop: `1px solid ${TOKENS.rule}`, width: "100%", maxWidth: 430, padding: "22px 22px 30px", maxHeight: "85vh", overflowY: "auto", fontFamily: TOKENS.fontBody, color: TOKENS.fg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div><Eyebrow>RECOMMENDATION PROFILE</Eyebrow><div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 24, fontWeight: 700, marginTop: 4 }}>내 추천 기준</div></div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: TOKENS.fgDim, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }} aria-label="닫기">×</button>
        </div>

        <Eyebrow style={{ marginBottom: 8 }}>성별 · 핏 참고</Eyebrow>
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[["female", "여성"], ["male", "남성"], ["other", "직접 선택"], ["none", "선택 안 함"]].map(([key, label]) => {
            const value = key === "none" ? "" : key;
            return <button key={key} onClick={() => setGender(value)} style={{ flex: 1, minHeight: 38, padding: "7px 4px", background: gender === value ? TOKENS.accent : "none", color: gender === value ? TOKENS.bg : TOKENS.fgMid, border: `1px solid ${gender === value ? TOKENS.accent : TOKENS.rule}`, fontFamily: TOKENS.fontDisplay, fontSize: 11.5, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>;
          })}
        </div>

        <Eyebrow style={{ marginBottom: 8 }}>나이 (최대 100세)</Eyebrow>
        <input type="number" min="1" max="100" value={age} onChange={handleAgeChange} placeholder="선택 입력" style={{ width: "100%", background: "none", border: "none", borderBottom: `1px solid ${TOKENS.rule}`, color: TOKENS.fg, padding: "8px 0", fontSize: 14, fontFamily: TOKENS.fontBody, marginBottom: 22 }} />

        <Eyebrow style={{ marginBottom: 8 }}>생일 · 선택</Eyebrow>
        <input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} style={{ width: "100%", background: "none", border: "none", borderBottom: `1px solid ${TOKENS.rule}`, color: TOKENS.fg, padding: "8px 0", fontSize: 14, fontFamily: TOKENS.fontBody, marginBottom: 8, colorScheme: "dark" }} />
        <p style={{ margin: "0 0 22px", color: TOKENS.fgDim, fontSize: 11, lineHeight: 1.5 }}>매년 이 날짜(월·일)가 되면 달력과 화면에 생일 표시를 해드려요.</p>

        <Eyebrow style={{ marginBottom: 8 }}>건강상 주의사항 · 선택</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          {healthOptions.map(([key, label]) => <button key={key} onClick={() => toggleHealth(key)} style={{ textAlign: "left", minHeight: 38, padding: "8px 10px", background: health.includes(key) ? "rgba(212,255,80,0.12)" : "none", color: health.includes(key) ? TOKENS.fg : TOKENS.fgMid, border: `1px solid ${health.includes(key) ? TOKENS.accent : TOKENS.rule}`, fontFamily: TOKENS.fontBody, fontSize: 12, cursor: "pointer" }}>{health.includes(key) ? "✓ " : "□ "}{label}</button>)}
        </div>
        {health.includes("other") && <input type="text" value={healthOther} onChange={(event) => setHealthOther(event.target.value)} placeholder="예: 무릎 관절이 약해요, 땀이 많은 편이에요" maxLength={60} style={{ width: "100%", background: "none", border: "none", borderBottom: `1px solid ${TOKENS.rule}`, color: TOKENS.fg, padding: "8px 0", fontSize: 13.5, fontFamily: TOKENS.fontBody, marginBottom: 10 }} />}
        <p style={{ margin: "0 0 22px", color: TOKENS.fgDim, fontSize: 11, lineHeight: 1.5 }}>의료 진단이나 치료를 대신하지 않으며, 옷차림과 활동 주의사항 참고로만 사용해요.</p>
        <button onClick={() => onSave({ gender, age, health, healthOther: health.includes("other") ? healthOther.trim() : "", birthday })} style={{ width: "100%", background: TOKENS.accent, color: TOKENS.bg, border: "none", padding: "15px 0", fontFamily: TOKENS.fontDisplay, fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}>저장하기</button>
      </div>
    </div>
  );
}

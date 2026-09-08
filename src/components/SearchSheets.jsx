import { useEffect, useState } from "react";
import { TOKENS } from "../constants";
import { searchCity } from "../lib/locationApi";
import { Eyebrow, FeelingMark } from "./common";

const sheetStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 };
const panelStyle = { background: TOKENS.bgRaised, borderTop: `1px solid ${TOKENS.rule}`, width: "100%", maxWidth: 430, padding: "22px 22px 30px", maxHeight: "80vh", overflowY: "auto", fontFamily: TOKENS.fontBody, color: TOKENS.fg };

export function RecordSearchSheet({ records, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = normalized ? Object.entries(records).filter(([, record]) => (record.items_worn || "").toLowerCase().includes(normalized) || (record.user_memo || "").toLowerCase().includes(normalized)).sort((a, b) => (a[0] < b[0] ? 1 : -1)) : [];
  return (
    <div className="ootd-scope" style={sheetStyle} onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} style={panelStyle}>
        <SheetTitle eyebrow="SEARCH RECORDS" title="기록 검색" onClose={onClose} />
        <input type="text" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="입은 옷이나 메모로 검색 (예: 니트, 비)" style={{ width: "100%", background: "none", border: "none", borderBottom: `1px solid ${TOKENS.rule}`, color: TOKENS.fg, padding: "8px 0", fontSize: 15, fontFamily: TOKENS.fontBody, marginBottom: 18 }} />
        {normalized && results.length === 0 && <Eyebrow>검색 결과가 없어요</Eyebrow>}
        {results.map(([dateStr, record]) => <button key={dateStr} onClick={() => onSelect(dateStr)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderTop: `1px solid ${TOKENS.rule}`, padding: "14px 0", cursor: "pointer", color: TOKENS.fg }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><FeelingMark feeling={record.feeling} active size={12} /><span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 12, color: TOKENS.fgDim }}>{dateStr}</span></div><div style={{ fontSize: 14, marginTop: 4 }}>{record.items_worn}</div>{record.user_memo && <div style={{ fontSize: 12, color: TOKENS.fgMid, marginTop: 2 }}>{record.user_memo}</div>}</button>)}
      </div>
    </div>
  );
}

export function LocationSearchSheet({ favorites, onToggleFavorite, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const isFavorite = (place) => favorites.some((favorite) => favorite.name === place.name && favorite.latitude === place.latitude && favorite.longitude === place.longitude);

  useEffect(() => {
    if (query.trim().length < 1) { setResults([]); return undefined; }
    setSearching(true);
    const timer = setTimeout(() => searchCity(query).then((items) => { setResults(items); setSearching(false); }), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const placeButton = (place) => <button onClick={() => onSelect(place)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: "14px 0", cursor: "pointer", color: TOKENS.fg }}><div style={{ fontSize: 15, fontWeight: 500 }}>{place.name}</div><div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 11.5, color: TOKENS.fgDim, letterSpacing: "0.04em", marginTop: 2 }}>{[place.admin1, place.country].filter(Boolean).join(" · ")}</div></button>;
  const favoriteButton = (place) => <button onClick={() => onToggleFavorite(place)} style={{ background: "none", border: "none", color: isFavorite(place) ? TOKENS.accent : TOKENS.fgDim, fontSize: 18, cursor: "pointer", padding: 8 }} aria-label="즐겨찾기">{isFavorite(place) ? "★" : "☆"}</button>;

  return (
    <div className="ootd-scope" style={sheetStyle} onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} style={panelStyle}>
        <SheetTitle eyebrow="SEARCH LOCATION" title="지역 검색" onClose={onClose} />
        <input type="text" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="도시 이름을 입력하세요 (예: 부산, 파리, 도쿄)" style={{ width: "100%", background: "none", border: "none", borderBottom: `1px solid ${TOKENS.rule}`, color: TOKENS.fg, padding: "8px 0", fontSize: 15, fontFamily: TOKENS.fontBody, marginBottom: 18 }} />
        {query.trim().length === 0 && favorites.length > 0 && <><Eyebrow style={{ marginBottom: 6 }}>즐겨찾기</Eyebrow>{favorites.map((favorite, index) => <div key={index} style={{ display: "flex", alignItems: "center", borderTop: `1px solid ${TOKENS.rule}` }}>{placeButton(favorite)}{favoriteButton(favorite)}</div>)}</>}
        {searching && <Eyebrow>검색 중...</Eyebrow>}
        {!searching && query.trim().length > 0 && results.length === 0 && <Eyebrow>검색 결과가 없어요</Eyebrow>}
        {results.map((place, index) => <div key={index} style={{ display: "flex", alignItems: "center", borderTop: `1px solid ${TOKENS.rule}` }}>{placeButton(place)}{favoriteButton(place)}</div>)}
      </div>
    </div>
  );
}

function SheetTitle({ eyebrow, title, onClose }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}><div><Eyebrow>{eyebrow}</Eyebrow><div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 24, fontWeight: 700, marginTop: 4 }}>{title}</div></div><button onClick={onClose} style={{ background: "none", border: "none", color: TOKENS.fgDim, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }} aria-label="닫기">×</button></div>;
}

const STORAGE_KEY = "ootd-records-v1";
const PROFILE_KEY = "ootd-profile-v1";
const FAVORITES_KEY = "ootd-favorites-v1";
const WARDROBE_KEY = "ootd-wardrobe-v1";
const UNIT_KEY = "ootd-unit-v1";
const COLOR_SCHEME_KEY = "ootd-color-scheme-v1";
let storageScope = null;

export function setStorageScope(userId = null) {
  storageScope = userId;
}

function scopedKey(key) {
  return storageScope ? `${key}:${storageScope}` : key;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value, label) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`${label} 저장 실패`, error);
  }
}

export const loadRecords = () => readJson(scopedKey(STORAGE_KEY), {});
export const saveRecords = (records) => writeJson(scopedKey(STORAGE_KEY), records, "기록");

export const loadProfile = () => readJson(scopedKey(PROFILE_KEY), { gender: "", age: "", health: [], healthOther: "", birthday: "" });
export const saveProfile = (profile) => writeJson(scopedKey(PROFILE_KEY), profile, "프로필");

export const loadFavorites = () => readJson(scopedKey(FAVORITES_KEY), []);
export const saveFavorites = (favorites) => writeJson(scopedKey(FAVORITES_KEY), favorites, "즐겨찾기");

export const loadWardrobe = () => readJson(scopedKey(WARDROBE_KEY), []);
export const saveWardrobe = (wardrobe) => writeJson(scopedKey(WARDROBE_KEY), wardrobe, "옷장");

export function loadUnit() {
  try {
    return localStorage.getItem(scopedKey(UNIT_KEY)) === "F" ? "F" : "C";
  } catch (error) {
    return "C";
  }
}

export function saveUnit(unit) {
  try {
    localStorage.setItem(scopedKey(UNIT_KEY), unit);
  } catch (error) {
    console.error("온도 단위 저장 실패", error);
  }
}

function readColorScheme(key) {
  try {
    return localStorage.getItem(key) === "light" ? "light" : "dark";
  } catch (error) {
    return "dark";
  }
}

export function loadColorScheme() {
  return readColorScheme(scopedKey(COLOR_SCHEME_KEY));
}

export function saveColorScheme(scheme) {
  try {
    localStorage.setItem(scopedKey(COLOR_SCHEME_KEY), scheme === "light" ? "light" : "dark");
  } catch (error) {
    console.error("화면 색상 설정 저장 실패", error);
  }
}

export function loadLegacyAppData() {
  const readLegacyJson = (key, fallback) => readJson(key, fallback);
  let legacyUnit = "C";
  try {
    legacyUnit = localStorage.getItem(UNIT_KEY) === "F" ? "F" : "C";
  } catch (error) {
    console.error("기존 온도 단위를 읽지 못했어요.", error);
  }
  return {
    records: readLegacyJson(STORAGE_KEY, {}),
    profile: readLegacyJson(PROFILE_KEY, { gender: "", age: "", health: [], healthOther: "", birthday: "" }),
    favorites: readLegacyJson(FAVORITES_KEY, []),
    wardrobe: readLegacyJson(WARDROBE_KEY, []),
    unit: legacyUnit,
    colorScheme: readColorScheme(COLOR_SCHEME_KEY),
  };
}

export function loadCurrentAppData() {
  return {
    records: loadRecords(),
    profile: loadProfile(),
    favorites: loadFavorites(),
    wardrobe: loadWardrobe(),
    unit: loadUnit(),
    colorScheme: loadColorScheme(),
  };
}

export function saveAppData(data) {
  saveRecords(data.records);
  saveProfile(data.profile);
  saveFavorites(data.favorites);
  saveWardrobe(data.wardrobe);
  saveUnit(data.unit);
  saveColorScheme(data.colorScheme);
}

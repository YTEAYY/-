export const CLOTHING_COLORS = [
  { id: "black", name: "블랙", hex: "#282828" },
  { id: "white", name: "화이트", hex: "#F5F4F0" },
  { id: "ivory", name: "아이보리", hex: "#E8DFC9" },
  { id: "gray", name: "그레이", hex: "#8C9095" },
  { id: "navy", name: "네이비", hex: "#26364D" },
  { id: "blue", name: "블루", hex: "#6A8EAD" },
  { id: "beige", name: "베이지", hex: "#C9B89A" },
  { id: "brown", name: "브라운", hex: "#79563D" },
  { id: "khaki", name: "카키", hex: "#777957" },
  { id: "green", name: "그린", hex: "#557663" },
  { id: "pink", name: "핑크", hex: "#D69BA5" },
  { id: "red", name: "레드", hex: "#B04A4A" },
  { id: "burgundy", name: "버건디", hex: "#71364A" },
  { id: "yellow", name: "옐로", hex: "#D4B34F" },
  { id: "purple", name: "퍼플", hex: "#806C96" },
];

const PALETTES = [
  { name: "모던 뉴트럴", colors: ["black", "white", "gray"] },
  { name: "클래식", colors: ["navy", "ivory", "beige"] },
  { name: "어스 톤", colors: ["khaki", "brown", "ivory"] },
  { name: "쿨 블루", colors: ["blue", "navy", "white"] },
  { name: "소프트 포인트", colors: ["pink", "gray", "ivory"] },
  { name: "딥 포인트", colors: ["burgundy", "navy", "ivory"] },
  { name: "그린 포인트", colors: ["green", "beige", "brown"] },
  { name: "선명한 포인트", colors: ["yellow", "navy", "white"] },
  { name: "레드 포인트", colors: ["red", "navy", "ivory"] },
  { name: "퍼플 포인트", colors: ["purple", "gray", "white"] },
  { name: "블랙 포인트", colors: ["black", "beige", "burgundy"] },
  { name: "데님 톤", colors: ["blue", "gray", "ivory"] },
  { name: "카키 클래식", colors: ["khaki", "navy", "white"] },
  { name: "로즈 톤", colors: ["pink", "burgundy", "white"] },
  { name: "버건디 어스", colors: ["burgundy", "beige", "pink"] },
  { name: "그린 클래식", colors: ["green", "navy", "white"] },
  { name: "웜 옐로", colors: ["yellow", "beige", "brown"] },
  { name: "레드 어스", colors: ["red", "beige", "brown"] },
  { name: "라벤더 톤", colors: ["purple", "beige", "navy"] },
];

const COLOR_BY_ID = new Map(CLOTHING_COLORS.map((color) => [color.id, color]));

export function getColorPaletteOptions(outfitEntries = []) {
  const wardrobeColors = new Set(
    outfitEntries
      .map(({ item }) => item.color)
      .filter((color) => COLOR_BY_ID.has(color))
  );
  const palettes = PALETTES.map((palette, index) => ({
    ...palette,
    colors: palette.colors.map((colorId) => COLOR_BY_ID.get(colorId)),
    score: palette.colors.filter((colorId) => wardrobeColors.has(colorId)).length,
    index,
  }));
  const matchingPalettes = palettes.filter((palette) => palette.score > 0);
  const options = matchingPalettes.length
    ? matchingPalettes.sort((a, b) => b.score - a.score || a.index - b.index)
    : palettes;

  return {
    options,
    isWardrobeBased: matchingPalettes.length > 0,
  };
}

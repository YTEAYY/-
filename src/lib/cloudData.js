import { supabase } from "./supabase";

const DEFAULT_PROFILE = { gender: "", age: "", health: [], healthOther: "", birthday: "" };

export function normalizeAppData(data = {}) {
  return {
    records: data.records && typeof data.records === "object" && !Array.isArray(data.records) ? data.records : {},
    profile: data.profile && typeof data.profile === "object" ? data.profile : DEFAULT_PROFILE,
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    wardrobe: Array.isArray(data.wardrobe) ? data.wardrobe : [],
    unit: data.unit === "F" ? "F" : "C",
  };
}

export async function loadCloudData(userId) {
  const { data, error } = await supabase
    .from("user_app_data")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeAppData(data.data) : null;
}

export async function saveCloudData(userId, appData) {
  const { error } = await supabase.from("user_app_data").upsert(
    { user_id: userId, data: normalizeAppData(appData), updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

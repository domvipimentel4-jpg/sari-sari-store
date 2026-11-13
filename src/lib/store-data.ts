import { supabase } from "./supabase";

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function loadList<T>(name: string): Promise<T[]> {
  try {
    const userId = await currentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from("store_lists")
      .select("data")
      .eq("user_id", userId)
      .eq("name", name)
      .maybeSingle();

    if (error || !data) return [];
    return data.data as T[];
  } catch {
    return [];
  }
}

export async function saveList<T>(name: string, list: T[]) {
  const userId = await currentUserId();
  if (!userId) return;

  const { error } = await supabase.from("store_lists").upsert(
    {
      user_id: userId,
      name,
      data: list,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,name" },
  );

  if (error) console.warn("Could not save list:", error.message);
}

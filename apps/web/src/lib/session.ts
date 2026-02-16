import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "./supabase-server";

export async function getSession(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireSession(): Promise<User> {
  const user = await getSession();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

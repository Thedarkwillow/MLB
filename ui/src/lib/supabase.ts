import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const url = rawUrl?.trim() ?? "";
const anonKey = rawAnonKey?.trim() ?? "";

if (!url || !anonKey) {
  throw new Error(
    `Missing envs: url_present=${Boolean(url)} anon_present=${Boolean(anonKey)}`
  );
}

if (!url.startsWith("https://")) {
  throw new Error(`Bad VITE_SUPABASE_URL: ${url}`);
}

if (
  !anonKey.startsWith("sb_publishable_") &&
  !anonKey.startsWith("eyJ")
) {
  throw new Error(`Unexpected anon key prefix: ${anonKey.slice(0, 20)}`);
}

export const supabase = createClient(url, anonKey);
export const supabaseDebug = {
  url,
  anonPrefix: anonKey.slice(0, 20),
  anonLength: anonKey.length,
};

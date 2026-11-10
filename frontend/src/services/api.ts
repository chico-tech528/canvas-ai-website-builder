import axios from "axios";
import type { WebsiteSchema } from "../types";
import { supabase } from "./supabase";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 135_000,
});

api.interceptors.request.use(async (config) => {
  if (!supabase) return config;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function generateWebsite(prompt: string): Promise<WebsiteSchema> {
  const response = await api.post<{ success: boolean; website: WebsiteSchema }>("/generate", { prompt });
  return response.data.website;
}

export async function generateTheme(prompt: string): Promise<WebsiteSchema["theme"]> {
  const response = await api.post<{ success: boolean; theme: WebsiteSchema["theme"] }>("/theme", { prompt });
  return response.data.theme;
}

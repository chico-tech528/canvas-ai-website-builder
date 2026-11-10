import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "../services/supabase";
import { AuthContext, type AuthContextValue } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error("Unable to restore authentication session:", error.message);
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user || null,
    async signIn(identifier, password) {
      if (!supabase) throw new Error("Authentication is not configured for this deployment.");
      const credential = identifier.includes("@")
        ? { email: identifier, password }
        : { phone: identifier, password };
      const { data, error } = await supabase.auth.signInWithPassword(credential);
      if (error) throw error;
      const metadataPhone = data.user.user_metadata.phone_number;
      const phoneToVerify = typeof metadataPhone === "string" && metadataPhone !== data.user.phone
        ? metadataPhone
        : null;
      return { phoneToVerify };
    },
    async signInWithGoogle() {
      if (!supabase) throw new Error("Authentication is not configured for this deployment.");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    },
    async signUp(email, password, name, phone) {
      if (!supabase) throw new Error("Authentication is not configured for this deployment.");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name, phone_number: phone },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return Boolean(data.session);
    },
    async startPhoneVerification(phone) {
      if (!supabase) throw new Error("Authentication is not configured for this deployment.");
      const { error } = await supabase.auth.updateUser({ phone });
      if (error) throw error;
    },
    async resendPhoneVerification(phone) {
      if (!supabase) throw new Error("Authentication is not configured for this deployment.");
      const { error } = await supabase.auth.resend({ type: "phone_change", phone });
      if (error) throw error;
    },
    async verifyPhone(phone, token) {
      if (!supabase) throw new Error("Authentication is not configured for this deployment.");
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "phone_change",
      });
      if (error) throw error;
    },
    async resetPassword(email) {
      if (!supabase) throw new Error("Authentication is not configured for this deployment.");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
    },
    async signOut() {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import type { Session, User } from "@supabase/supabase-js";
import { createContext } from "react";

export interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signIn(identifier: string, password: string): Promise<{ phoneToVerify: string | null }>;
  signInWithGoogle(): Promise<void>;
  signUp(email: string, password: string, name: string, phone: string): Promise<boolean>;
  startPhoneVerification(phone: string): Promise<void>;
  resendPhoneVerification(phone: string): Promise<void>;
  verifyPhone(phone: string, token: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

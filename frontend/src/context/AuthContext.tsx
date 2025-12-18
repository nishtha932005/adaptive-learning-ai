import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null; data?: { user: User | null } }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // After signup or signin, ensure student record exists
      if (event === "SIGNED_IN" && session?.user) {
        // Run upsert in background to avoid blocking the main auth flow
        (async () => {
          try {
            // Check if student record exists first to avoid overwriting existing data
            const { data: existingStudent } = await supabase
              .from("students")
              .select("id")
              .eq("id", session.user.id)
              .maybeSingle();

            if (!existingStudent) {
              await supabase.from("students").insert({
                id: session.user.id,
                email: session.user.email || "",
                full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                account_type: "personal",
                onboarding_completed: false,
              });
            }
          } catch (err) {
            console.warn("Background student upsert failed:", err);
          }
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split("@")[0],
          },
        },
      });
      return {
        error: error ? new Error(error.message) : null,
        data: data ? { user: data.user } : undefined
      };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (e) {
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


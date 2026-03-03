import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  signUp as amplifySignUp,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode as amplifyResendSignUpCode,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";
import type { AuthUser, AuthSession } from "aws-amplify/auth";
import { ensureAmplifyConfigured } from "../awsConfig";

type PublicUser = {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
};

type AuthResult<T = undefined> = T extends undefined
  ? { error: Error | null }
  : { error: Error | null; data?: T };

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null; // kept for backward compatibility
  currentUser: AuthUser | null; // new alias for clarity
  isAuthenticated: boolean;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<AuthResult<{ user: PublicUser | null }>>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  confirmSignUp: (email: string, code: string) => Promise<AuthResult>;
  resendSignUpCode: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message?: string }).message;
    return new Error(msg || "Unknown error");
  }
  return new Error("Unknown error");
}

function normalizeAuthError(error: unknown): Error {
  const baseError = toError(error);

  if (typeof error === "object" && error !== null && "name" in error) {
    const code = String((error as { name?: string }).name || "");

    if (code === "UsernameExistsException") {
      return new Error("Account already exists. Please sign in.");
    }

    if (code === "UserNotConfirmedException") {
      return new Error("Please verify your account before signing in.");
    }
  }

  return baseError;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  ensureAmplifyConfigured();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuthState = async () => {
    try {
      ensureAmplifyConfigured();
      const [currentUser, currentSession] = await Promise.all([
        getCurrentUser(),
        fetchAuthSession(),
      ]);
      setUser(currentUser);
      setSession(currentSession);
    } catch {
      setUser(null);
      setSession(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshAuthState();
      setLoading(false);
    };
    void init();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      ensureAmplifyConfigured();
      const result = await amplifySignUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name: fullName || email.split("@")[0],
          },
        },
      });

      console.log("Cognito signup success:", result);
      const isConfirmed = result.nextStep?.signUpStep === "DONE";

      return {
        error: null,
        data: {
          user: {
            id: result.userId,
            email,
            email_confirmed_at: isConfirmed ? new Date().toISOString() : null,
          },
        },
      };
    } catch (error: unknown) {
      const normalizedError = normalizeAuthError(error);
      console.error("Cognito signup error:", normalizedError, error);
      return { error: normalizedError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      ensureAmplifyConfigured();
      const result = await amplifySignIn({
        username: email,
        password,
      });

      // For hackathon scope: require fully signed-in state
      if (!result.isSignedIn) {
        if (result.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
          return {
            error: new Error("Please verify your account before signing in."),
          };
        }
        return { error: new Error(`Sign-in not complete: ${result.nextStep.signInStep}`) };
      }

      await refreshAuthState();
      return { error: null };
    } catch (error: unknown) {
      return { error: normalizeAuthError(error) };
    }
  };

  const confirmSignUp = async (email: string, code: string) => {
    try {
      ensureAmplifyConfigured();
      await amplifyConfirmSignUp({
        username: email,
        confirmationCode: code,
      });
      return { error: null };
    } catch (error: unknown) {
      const normalizedError = normalizeAuthError(error);
      console.error("Cognito confirm signup error:", normalizedError, error);
      return { error: normalizedError };
    }
  };

  const resendSignUpCode = async (email: string) => {
    try {
      ensureAmplifyConfigured();
      await amplifyResendSignUpCode({ username: email });
      return { error: null };
    } catch (error: unknown) {
      const normalizedError = normalizeAuthError(error);
      console.error("Cognito resend code error:", normalizedError, error);
      return { error: normalizedError };
    }
  };

  const signOut = async () => {
    try {
      ensureAmplifyConfigured();
      await amplifySignOut();
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const isAuthenticated = useMemo(
    () => Boolean(user && session?.tokens?.idToken),
    [user, session]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        currentUser: user,
        isAuthenticated,
        loading,
        signUp,
        signIn,
        confirmSignUp,
        resendSignUpCode,
        signOut,
      }}
    >
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
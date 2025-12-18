import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check onboarding status
  useEffect(() => {
    if (loading) return;

    if (!user?.id) {
      setCheckingOnboarding(false);
      return;
    }

    const checkOnboarding = async () => {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error checking onboarding:", error);
          setOnboardingCompleted(false);
        } else {
          setOnboardingCompleted(data?.onboarding_completed ?? false);
        }
      } catch (e) {
        console.error("Failed to check onboarding:", e);
        setOnboardingCompleted(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [user?.id, loading]);

  // Show loading state while checking auth or onboarding
  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to home page if not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Redirect to onboarding if not completed (unless already on onboarding page)
  if (onboardingCompleted === false && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Render protected content
  return <>{children}</>;
}


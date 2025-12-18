import React from "react";
import Sidebar from "./Sidebar";
import { motion } from "framer-motion";
import GamificationHeader from "./GamificationHeader";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { DashboardStudent } from "../lib/supabase";

interface DashboardLayoutProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
  children: React.ReactNode;
}

export default function DashboardLayout({
  activePage,
  onNavigate,
  children,
}: DashboardLayoutProps) {
  const { user } = useAuth();
  const [student, setStudent] = React.useState<DashboardStudent | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase.from("students").select("*").eq("id", user.id).single();
      if (mounted && data) setStudent(data as any);
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background text-slate-900 dark:text-slate-100 pl-64 relative">
      <Sidebar />

      <div className="relative z-10">
        <GamificationHeader student={student} />
        {children}
      </div>
    </div>
  );
}




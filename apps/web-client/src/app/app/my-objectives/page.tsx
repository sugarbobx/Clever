"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { useAuth } from "@/stores/auth.store";
import { MyObjectives } from "@/components/objectives/MyObjectives";

export default function MyObjectivesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Page personnelle — collaborateurs et stagiaires (le manager a /app/objectives).
  useEffect(() => {
    if (!loading && user && user.role !== "EMPLOYEE" && user.role !== "TRAINEE") {
      router.replace("/app/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
          <Target size={22} /> Mes objectifs
        </h1>
        <p className="text-sm text-muted">Vos objectifs assignés par le manager, avec suivi des sous-objectifs.</p>
      </div>
      <MyObjectives />
    </div>
  );
}

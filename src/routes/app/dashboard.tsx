import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/shared/auth/AuthContext";
import { PrintingDashboardView } from "@/domains/printing/DashboardView";
import { LaundryDashboardView } from "@/domains/laundry/DashboardView";
import { DashboardView as UniversalDashboardView } from "@/domains/fnb/DashboardView";

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardRouter,
});

function DashboardRouter() {
  const { user } = useAuth();

  if (user?.businessType === "PRINTING") {
    return <PrintingDashboardView />;
  }

  if (user?.businessType === "LAUNDRY") {
    return <LaundryDashboardView />;
  }

  return <UniversalDashboardView />;
}

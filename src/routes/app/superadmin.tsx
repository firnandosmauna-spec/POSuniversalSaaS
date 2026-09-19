import { createFileRoute } from "@tanstack/react-router";
import { SuperadminView } from "@/domains/superadmin/SuperadminView";

export const Route = createFileRoute("/app/superadmin")({
  component: AppSuperadminRoute,
});

function AppSuperadminRoute() {
  return <SuperadminView />;
}

import { createFileRoute } from "@tanstack/react-router";
import { SuperadminView } from "@/domains/superadmin/SuperadminView";

export const Route = createFileRoute("/superadmin")({
  component: SuperadminRoute,
});

function SuperadminRoute() {
  return <SuperadminView />;
}

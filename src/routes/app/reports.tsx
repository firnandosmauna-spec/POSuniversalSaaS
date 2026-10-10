import { createFileRoute } from "@tanstack/react-router";
import { ReportsView } from "@/domains/fnb/ReportsView";

export const Route = createFileRoute("/app/reports")({
  component: ReportsView,
});

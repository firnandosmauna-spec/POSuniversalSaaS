import { createFileRoute } from "@tanstack/react-router";
import { ShiftsView } from "@/domains/fnb/ShiftsView";

export const Route = createFileRoute("/app/shifts")({
  component: ShiftsView,
});

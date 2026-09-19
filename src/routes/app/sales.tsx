import { createFileRoute } from "@tanstack/react-router";
import { SalesView } from "@/domains/fnb/SalesView";

export const Route = createFileRoute("/app/sales")({
  component: SalesView,
});

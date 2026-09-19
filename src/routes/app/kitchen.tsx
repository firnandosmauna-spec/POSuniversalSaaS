import { createFileRoute } from "@tanstack/react-router";
import { KitchenView } from "@/domains/fnb/KitchenView";

export const Route = createFileRoute("/app/kitchen")({
  component: KitchenView,
});

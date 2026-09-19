import { createFileRoute } from "@tanstack/react-router";
import { CustomersView } from "@/domains/fnb/CustomersView";

export const Route = createFileRoute("/app/customers")({
  component: CustomersView,
});

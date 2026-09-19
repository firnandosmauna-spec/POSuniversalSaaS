import { createFileRoute } from "@tanstack/react-router";
import { ExpensesView } from "@/domains/fnb/ExpensesView";

export const Route = createFileRoute("/app/expenses")({
  component: ExpensesView,
});

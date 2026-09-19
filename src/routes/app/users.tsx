import { createFileRoute } from "@tanstack/react-router";
import { UsersView } from "@/domains/fnb/UsersView";

export const Route = createFileRoute("/app/users")({
  component: UsersView,
});

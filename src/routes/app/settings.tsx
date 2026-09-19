import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/domains/fnb/SettingsView";

export const Route = createFileRoute("/app/settings")({
  component: SettingsView,
});

import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/cms")({
  component: () => <Navigate to="/cms" replace />,
});

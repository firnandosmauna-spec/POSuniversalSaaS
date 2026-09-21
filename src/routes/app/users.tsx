import { createFileRoute } from "@tanstack/react-router";
import { UsersView as FnbUsersView } from "@/domains/fnb/UsersView";
import { LaundryUsersView } from "@/domains/laundry/UsersView";
import { useAuth } from "@/shared/auth/AuthContext";

function UsersRouteComponent() {
  const { user } = useAuth();
  
  if (user?.businessType === "LAUNDRY") {
    return <LaundryUsersView />;
  }
  
  return <FnbUsersView />;
}

export const Route = createFileRoute("/app/users")({
  component: UsersRouteComponent,
});

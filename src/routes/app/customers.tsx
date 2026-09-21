import { createFileRoute } from "@tanstack/react-router";
import { CustomersView as FnbCustomersView } from "@/domains/fnb/CustomersView";
import { LaundryCustomersView } from "@/domains/laundry/CustomersView";
import { useAuth } from "@/shared/auth/AuthContext";

function CustomersRouteComponent() {
  const { user } = useAuth();
  
  if (user?.businessType === "LAUNDRY") {
    return <LaundryCustomersView />;
  }
  
  return <FnbCustomersView />;
}

export const Route = createFileRoute("/app/customers")({
  component: CustomersRouteComponent,
});

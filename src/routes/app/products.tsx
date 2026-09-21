import { createFileRoute } from "@tanstack/react-router";
import { ProductsView as FnbProductsView } from "@/domains/fnb/ProductsView";
import { LaundryProductsView } from "@/domains/laundry/ProductsView";
import { useAuth } from "@/shared/auth/AuthContext";

function ProductsRouteComponent() {
  const { user } = useAuth();
  
  if (user?.businessType === "LAUNDRY") {
    return <LaundryProductsView />;
  }
  
  return <FnbProductsView />;
}

export const Route = createFileRoute("/app/products")({
  component: ProductsRouteComponent,
});

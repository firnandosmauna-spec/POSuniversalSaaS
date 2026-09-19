import { createFileRoute } from "@tanstack/react-router";
import { ProductsView } from "@/domains/fnb/ProductsView";

export const Route = createFileRoute("/app/products")({
  component: ProductsView,
});

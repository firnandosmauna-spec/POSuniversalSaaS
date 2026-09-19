import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useAuth } from "@/shared/auth/AuthContext";

// Lazy load komponen POS masing-masing domain
const FnbPOS = lazy(() => import("@/domains/fnb/POSView"));
const RetailPOS = lazy(() => import("@/domains/retail/POSView"));
const PrintingPOS = lazy(() => import("@/domains/printing/POSView"));
const LaundryPOS = lazy(() => import("@/domains/laundry/POSView"));

export const Route = createFileRoute("/app/pos")({
  component: POSRouter,
});

function POSRouter() {
  const { user } = useAuth();

  // Route ke komponen spesifik berdasarkan tipe bisnis
  let POSComponent = null;

  if (user?.businessType === "PRINTING") {
    POSComponent = <PrintingPOS />;
  } else if (user?.businessType === "LAUNDRY") {
    POSComponent = <LaundryPOS />;
  } else if (
    user?.businessType === "RETAIL" ||
    user?.businessType === "GROCERY" ||
    user?.businessType === "E_COMMERCE" ||
    user?.businessType === "DISTRIBUTOR"
  ) {
    POSComponent = <RetailPOS />;
  } else {
    // Default F&B / Cafe / General POS
    POSComponent = <FnbPOS />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          Memuat sistem POS...
        </div>
      }
    >
      {POSComponent}
    </Suspense>
  );
}

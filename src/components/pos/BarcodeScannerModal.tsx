import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "html5-qrcode-reader";

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error).finally(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        });
      }
      return;
    }

    setIsInitializing(true);
    setError(null);
    
    // Add a slight delay to ensure Radix Dialog mounts the element in the DOM
    const initTimer = setTimeout(() => {
      const element = document.getElementById(containerId);
      if (!element) {
        console.error("Scanner element not found in DOM");
        return;
      }

      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        const startScanner = (cameraIdOrConfig: any) => {
          return scanner.start(
            cameraIdOrConfig,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              // Success handler
              if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error).finally(() => {
                  scannerRef.current?.clear();
                  scannerRef.current = null;
                  onClose();
                  // Optional delay to prevent rapid double-scanning issues
                  setTimeout(() => {
                    onScan(decodedText);
                  }, 100);
                });
              }
            },
            (errorMessage) => {
              // Ignore normal scanning errors
            }
          );
        };

        // Try rear camera first
        startScanner({ facingMode: "environment" })
          .then(() => {
            setIsInitializing(false);
          })
          .catch((err) => {
            console.warn("Rear camera failed, trying to get any camera...", err);
            // Fallback: try to get list of cameras and use the first one
            Html5Qrcode.getCameras()
              .then((devices) => {
                if (devices && devices.length > 0) {
                  startScanner(devices[0].id)
                    .then(() => setIsInitializing(false))
                    .catch((fallbackErr) => {
                      console.error("Fallback camera error:", fallbackErr);
                      setError("Gagal mengakses kamera. Pastikan Anda memberikan izin dan menggunakan koneksi aman (HTTPS/localhost).");
                      setIsInitializing(false);
                    });
                } else {
                  setError("Tidak ada kamera yang terdeteksi di perangkat Anda.");
                  setIsInitializing(false);
                }
              })
              .catch((camErr) => {
                console.error("Get cameras error:", camErr);
                setError("Gagal mengakses sistem kamera. Pastikan memberikan izin kamera & jalankan di jaringan aman (HTTPS/localhost).");
                setIsInitializing(false);
              });
          });
      } catch (err) {
        console.error("Error initializing scanner:", err);
        setError("Terjadi kesalahan saat memulai scanner.");
        setIsInitializing(false);
      }
    }, 200);

    return () => {
      clearTimeout(initTimer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error).finally(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        });
      }
    };
  }, [isOpen, onScan, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-slate-100">
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription className="text-xs">
            Arahkan kamera ke barcode produk
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[300px] relative">
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-slate-900/50">
              <Loader2 className="size-8 animate-spin mb-2" />
              <p className="text-sm font-medium">Memulai Kamera...</p>
            </div>
          )}
          {error ? (
            <div className="text-red-400 text-sm text-center px-4">
              {error}
            </div>
          ) : (
            <div id={containerId} className="w-full max-w-sm overflow-hidden rounded-xl bg-black"></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

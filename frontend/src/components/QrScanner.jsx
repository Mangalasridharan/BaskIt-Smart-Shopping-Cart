import { useState, useEffect, useRef } from "react";
import {
  HiOutlineCamera,
  HiOutlineExclamationCircle,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineRefresh,
} from "react-icons/hi";
import {
  CoreModule,
  CaptureVisionRouter,
  CameraView,
  CameraEnhancer,
  LicenseManager,
} from "dynamsoft-barcode-reader-bundle";
import { BrowserMultiFormatReader } from "@zxing/browser";

export const DEFAULT_SCAN_FORMATS = ["qr_code"];
export const PRODUCT_BARCODE_FORMATS = [
  "qr_code",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
];

// Configure Dynamsoft CDN engine resource path so WASM modules resolve properly in Vite
try {
  if (CoreModule && CoreModule.engineResourcePaths) {
    CoreModule.engineResourcePaths = {
      rootDirectory: "https://cdn.jsdelivr.net/npm/",
    };
  }
} catch {
  /* ignore */
}

// Dynamsoft 2.0 evaluation license key
const DYNAMSOFT_LICENSE =
  import.meta.env.VITE_DYNAMSOFT_LICENSE || "DLS2eyJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSJ9";

let isLicenseInitialized = false;
let licenseInitPromise = null;

const initDynamsoftLicense = async () => {
  if (isLicenseInitialized) return true;
  if (licenseInitPromise) return licenseInitPromise;

  licenseInitPromise = (async () => {
    try {
      await LicenseManager.initLicense(DYNAMSOFT_LICENSE);
      isLicenseInitialized = true;
      return true;
    } catch (err) {
      console.warn("⚠️ Dynamsoft license notice (falling back if needed):", err.message);
      return false;
    } finally {
      licenseInitPromise = null;
    }
  })();

  return licenseInitPromise;
};

const QrScanner = ({
  onDetected,
  onClose,
  busy,
  title = "Scan cart QR",
  subtitle = "Point the camera at the QR code on the cart display.",
  formats = DEFAULT_SCAN_FORMATS,
  footer = null,
  closeLabel = "Enter code manually instead",
}) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const routerRef = useRef(null);
  const cameraEnhancerRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const isDetectedRef = useRef(false);

  const [engine, setEngine] = useState("dynamsoft"); // "dynamsoft" | "zxing"
  const [status, setStatus] = useState("starting"); // "starting" | "scanning" | "denied" | "not_found" | "error"
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const startDynamsoftScanner = async () => {
      try {
        await initDynamsoftLicense();
        if (cancelled) return;

        // Initialize Camera View & Enhancer
        const cameraView = await CameraView.createInstance();
        if (cancelled) return;

        const cameraEnhancer = await CameraEnhancer.createInstance(cameraView);
        cameraEnhancerRef.current = cameraEnhancer;

        const router = await CaptureVisionRouter.createInstance();
        routerRef.current = router;
        router.setInput(cameraEnhancer);

        // Mount Dynamsoft UI Element to DOM container
        if (containerRef.current) {
          containerRef.current.replaceChildren(cameraView.getUIElement());
        }

        router.addResultReceiver({
          onDecodedBarcodesReceived: (result) => {
            if (cancelled || isDetectedRef.current) return;
            const items = result?.barcodeResultItems;
            if (items && items.length > 0) {
              const text = items[0].text;
              if (text && String(text).trim()) {
                isDetectedRef.current = true;
                onDetected(String(text).trim());
              }
            }
          },
        });

        await cameraEnhancer.open();
        if (cancelled) return;

        await router.startCapturing("ReadBarcodes_Default");
        if (cancelled) return;

        setEngine("dynamsoft");
        setStatus("scanning");
      } catch (err) {
        console.warn("⚠️ Dynamsoft scanner init notice:", err.message);
        if (!cancelled) {
          startUniversalFallback(err);
        }
      }
    };

    const startUniversalFallback = async (originalError) => {
      if (cancelled) return;
      setEngine("zxing");

      // Verify browser has camera mediaDevices
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setErrorMessage("Camera access is not supported in this browser.");
        return;
      }

      try {
        const reader = new BrowserMultiFormatReader();
        zxingReaderRef.current = reader;

        if (!videoRef.current) return;

        // Request camera stream and continuously decode
        await reader.decodeFromVideoDevice(
          undefined, // picks default environment / back camera or user webcam
          videoRef.current,
          (result, decodeError) => {
            if (cancelled || isDetectedRef.current) return;
            if (result) {
              const text = result.getText();
              if (text && String(text).trim()) {
                isDetectedRef.current = true;
                onDetected(String(text).trim());
              }
            }
          }
        );

        setStatus("scanning");
      } catch (err) {
        console.error("Camera scanner error:", err);
        const name = err.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setStatus("denied");
          setErrorMessage("Camera permission was denied. Click the lock or camera icon in your browser address bar to allow access.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setStatus("not_found");
          setErrorMessage("No camera was found on this computer. Use manual code entry below.");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setStatus("error");
          setErrorMessage("Camera is currently in use by another app (like Zoom or Teams).");
        } else {
          setStatus("error");
          setErrorMessage(err.message || originalError?.message || "Failed to start camera scanner.");
        }
      }
    };

    startDynamsoftScanner();

    return () => {
      cancelled = true;

      // Stop ZXing fallback if running
      if (zxingReaderRef.current) {
        try {
          zxingReaderRef.current.reset();
        } catch {}
      }

      // Stop Dynamsoft scanner if running
      if (routerRef.current) {
        try {
          routerRef.current.stopCapturing();
          routerRef.current.dispose();
        } catch {}
      }

      if (cameraEnhancerRef.current) {
        try {
          cameraEnhancerRef.current.close();
          cameraEnhancerRef.current.dispose();
        } catch {}
      }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-fade-in">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl shadow-indigo-950/50 text-slate-100">
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-lg text-white shadow-lg shadow-indigo-500/25">
            <HiOutlineCamera />
          </span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">{title}</h3>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                {engine === "dynamsoft" ? (
                  <>
                    <HiOutlineSparkles className="text-cyan-400" />
                    Dynamsoft DBR
                  </>
                ) : (
                  <>
                    <HiOutlineShieldCheck className="text-cyan-400" />
                    Camera Active
                  </>
                )}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {/* Camera Viewport Container */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black border border-slate-800 flex items-center justify-center">
          {/* Dynamsoft Viewport Container */}
          <div
            ref={containerRef}
            className={`w-full h-full relative ${engine === "dynamsoft" ? "block" : "hidden"}`}
            style={{ width: "100%", height: "100%" }}
          />

          {/* Universal Fallback Video Viewport */}
          {engine === "zxing" && (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />
          )}

          {/* Laser scanning guide overlay */}
          {status === "scanning" && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-3/4 h-3/4 border-2 border-dashed border-cyan-400/60 rounded-2xl relative animate-pulse">
                {/* Horizontal scanning laser */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-laser" />
              </div>
            </div>
          )}

          {/* Status Overlay states */}
          {status !== "scanning" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white bg-slate-950/85">
              {status === "starting" && (
                <>
                  <span className="w-8 h-8 border-2 border-indigo-400 border-t-cyan-400 rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-slate-200">
                    Connecting to camera scanner…
                  </p>
                </>
              )}

              {status === "denied" && (
                <>
                  <HiOutlineExclamationCircle className="text-4xl text-amber-400" />
                  <p className="text-sm font-bold text-slate-100">Camera Permission Blocked</p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                    {errorMessage || "Please allow camera access in your browser settings to scan QR and barcodes."}
                  </p>
                </>
              )}

              {status === "not_found" && (
                <>
                  <HiOutlineExclamationCircle className="text-4xl text-amber-400" />
                  <p className="text-sm font-bold text-slate-100">No Camera Found</p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                    {errorMessage || "No video input device detected. Please enter your code manually below."}
                  </p>
                </>
              )}

              {status === "error" && (
                <>
                  <HiOutlineExclamationCircle className="text-4xl text-rose-400" />
                  <p className="text-sm font-bold text-slate-100">Camera Unavailable</p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                    {errorMessage || "Could not start camera stream. Use manual entry below."}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Optional Form / Action Footer */}
        {footer}

        {/* Close Button */}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-xs font-bold uppercase tracking-wider text-slate-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {busy ? "Working…" : closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrScanner;

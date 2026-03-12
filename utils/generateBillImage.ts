import { captureRef } from "react-native-view-shot";

// Hàm chuyển bill component (ref) thành ảnh Base64 thô
export const generateBillImage = async (ref: any, timeoutMs: number = 5000): Promise<string | null> => {
  const isValidBase64 = (value: unknown): value is string => {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    // Do not enforce very large length; small receipts can still be valid images.
    return trimmed.length > 64;
  };

  const waitForRefReady = async (maxWaitMs: number): Promise<any | null> => {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (ref?.current) return ref.current;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return null;
  };

  const viewShotRef = await waitForRefReady(3000); // 🔧 Increased from 1.5s
  if (!viewShotRef) {
    console.error("[BILL CAPTURE] ViewShot ref timeout after 3s - layout not ready");
    return null;
  }
  console.log("[BILL CAPTURE] Ref ready, starting capture...");

  const captureByViewShot = async (): Promise<string> => {
    return viewShotRef.capture({
      format: "png",
      quality: 1,
      result: "base64",
    });
  };

  const captureByNativeRef = async (): Promise<string> => {
    return captureRef(viewShotRef, {
      format: "png",
      quality: 1,
      result: "base64",
    });
  };

  const withTimeout = <T,>(promise: Promise<T>): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Bill capture timeout")), timeoutMs)),
    ]);

  try {
    const strategies: Array<() => Promise<string>> = [];

    if (typeof viewShotRef.capture === "function") {
      strategies.push(captureByViewShot);
    }
    strategies.push(captureByNativeRef);
    if (typeof viewShotRef.capture === "function") {
      // Retry ViewShot path at the end as a fallback.
      strategies.push(captureByViewShot);
    }

    for (let i = 0; i < 4; i++) {
      const strategy = strategies[i % strategies.length];
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 120 + i * 120));
      }
      try {
        const base64 = await withTimeout(strategy());
        console.log(`[BILL CAPTURE] Try${i + 1} base64 length:`, base64?.length || 0);
        if (isValidBase64(base64)) return base64;
      } catch (error: any) {
        console.warn(`[BILL CAPTURE] Try${i + 1} failed:`, error?.message || error);
      }
    }

    return null;
  } catch (err) {
    console.error("Failed to capture bill image:", err);
    return null;
  }
};

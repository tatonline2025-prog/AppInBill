import { captureRef } from "react-native-view-shot";

// Hàm chuyển bill component (ref) thành ảnh Base64 thô
export const generateBillImage = async (ref: any, timeoutMs: number = 5000): Promise<string | null> => {
  const waitForRefReady = async (maxWaitMs: number): Promise<any | null> => {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (ref?.current) return ref.current;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return null;
  };

  const viewShotRef = await waitForRefReady(1500);
  if (!viewShotRef) {
    console.error("ViewShot ref is not ready");
    return null;
  }

  const captureOnce = async (): Promise<string> => {
    if (typeof viewShotRef.capture === "function") {
      return viewShotRef.capture({
        format: "png",
        quality: 1,
        result: "base64",
        snapshotContentContainer: true,
      });
    }

    return captureRef(viewShotRef, {
      format: "png",
      quality: 1,
      result: "base64",
      snapshotContentContainer: true,
    });
  };

  const withTimeout = <T,>(promise: Promise<T>): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Bill capture timeout")), timeoutMs)),
    ]);

  try {
    const base64 = await withTimeout(captureOnce());
    if (base64 && base64.length > 1000) return base64;

    await new Promise((resolve) => setTimeout(resolve, 120));
    const retryBase64 = await withTimeout(captureOnce());
    if (retryBase64 && retryBase64.length > 1000) return retryBase64;

    await new Promise((resolve) => setTimeout(resolve, 220));
    const retry2Base64 = await withTimeout(captureOnce());
    return retry2Base64 || null;
  } catch (err) {
    console.error("Failed to capture bill image:", err);
    return null;
  }
};


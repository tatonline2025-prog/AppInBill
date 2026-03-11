import { PermissionsAndroid, Platform } from "react-native";

const PERMISSION_CACHE_TTL = 30000;
const PERMISSION_REQUEST_TIMEOUT_MS = 5000;

let cachedResult: boolean | null = null;
let lastCheckedAt = 0;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("PERMISSION_TIMEOUT")), timeoutMs)),
  ]);
};

const getRequiredBluetoothPermissions = (): string[] => {
  if (Platform.OS !== "android") return [];

  const version = Number(Platform.Version);
  // Android 12+ requires runtime Nearby Devices permissions for Bluetooth access.
  if (!isNaN(version) && version >= 31) {
    return [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ];
  }

  // Android <= 11 does not require runtime bluetooth permission for bonded-device listing.
  return [];
};

const getMissingPermissions = async (permissions: string[]): Promise<string[]> => {
  if (permissions.length === 0) return [];

  const missing: string[] = [];
  for (const permission of permissions) {
    const granted = await PermissionsAndroid.check(permission as any);
    if (!granted) {
      missing.push(permission);
    }
  }
  return missing;
};

export async function requestBluetoothPermissions(force = false): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  const now = Date.now();
  if (!force && cachedResult !== null && now - lastCheckedAt < PERMISSION_CACHE_TTL) {
    return cachedResult;
  }

  try {
    const required = getRequiredBluetoothPermissions();
    const missingBeforeRequest = await getMissingPermissions(required);

    if (missingBeforeRequest.length === 0) {
      cachedResult = true;
      lastCheckedAt = now;
      return true;
    }

    const requestResult: Record<string, string> = await withTimeout(
      PermissionsAndroid.requestMultiple(missingBeforeRequest.map((permission) => permission as any)),
      PERMISSION_REQUEST_TIMEOUT_MS
    );

    const granted = missingBeforeRequest.every(
      (permission) => requestResult[permission as keyof typeof requestResult] === PermissionsAndroid.RESULTS.GRANTED
    );

    if (granted) {
      cachedResult = true;
      lastCheckedAt = now;
      return true;
    }

    const missingAfterRequest = await getMissingPermissions(required);
    const finalGranted = missingAfterRequest.length === 0;
    cachedResult = finalGranted;
    lastCheckedAt = now;
    return finalGranted;
  } catch {
    // Re-check once in case OS updated permission state after timeout/error.
    try {
      const required = getRequiredBluetoothPermissions();
      const missing = await getMissingPermissions(required);
      const finalGranted = missing.length === 0;
      cachedResult = finalGranted;
      lastCheckedAt = now;
      return finalGranted;
    } catch {
      cachedResult = false;
      lastCheckedAt = now;
      return false;
    }
  }
}

export async function isBluetoothEnabled(): Promise<boolean> {
  // BLEPrinter.init() does the real adapter check; keep this lightweight.
  return true;
}


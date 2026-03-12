import {
  isBluetoothEnabled,
  requestBluetoothPermissions,
} from "@/components/BluetoothPermission";
import { InvoiceInfo } from "@/types/invoice";
import { generateBillImage } from "@/utils/generateBillImage";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { showMessage } from "react-native-flash-message";
import { BLEPrinter } from "react-native-thermal-receipt-printer-image-qr";
import ViewShot from "react-native-view-shot";

interface PrinterDevice {
  name: string;
  address: string;
}

const SCAN_TIMEOUT = 5000;
const IMAGE_GENERATION_TIMEOUT = 8000;
const PRINT_TIMEOUT = 15000;
const READY_CACHE_TTL = 30000;
const SCAN_WATCHDOG_TIMEOUT = 12000;

const isBlePrinterModuleAvailable = () => {
  return !!(
    BLEPrinter &&
    typeof (BLEPrinter as any).init === "function" &&
    typeof (BLEPrinter as any).getDeviceList === "function" &&
    typeof (BLEPrinter as any).connectPrinter === "function" &&
    typeof (BLEPrinter as any).closeConn === "function"
  );
};

export const useInvoicePrinter = (
  viewShotRef: React.RefObject<ViewShot | null>,
  invoice: InvoiceInfo | null
) => {
  const [showPrinterManager, setShowPrinterManager] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<PrinterDevice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceInfo | null>(invoice || null);
  const [isPrinting, setIsPrinting] = useState(false);

  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const readyStateRef = useRef<{ isReady: boolean; checkedAt: number }>({
    isReady: false,
    checkedAt: 0,
  });
  const lastPrinterAddressRef = useRef<string | null>(null);
  const scanWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (invoice) setCurrentInvoice(invoice);
  }, [invoice]);

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
    ]);
  };

  const ensureBluetoothReady = async (force = false): Promise<boolean> => {
    if (!isBlePrinterModuleAvailable()) {
      Alert.alert(
        "Unsupported runtime",
        "Bluetooth printing requires a Development Build or production build. Expo Go is not supported."
      );
      return false;
    }

    const now = Date.now();
    if (!force && readyStateRef.current.isReady && now - readyStateRef.current.checkedAt < READY_CACHE_TTL) {
      return true;
    }

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert("Permission required", "Please allow Bluetooth permission to print.");
      return false;
    }

    const btEnabled = await isBluetoothEnabled();
    if (!btEnabled) {
      Alert.alert("Bluetooth is off", "Please turn on Bluetooth and try again.");
      return false;
    }

    await withTimeout(BLEPrinter.init(), 8000, "Bluetooth init timeout.");
    readyStateRef.current = { isReady: true, checkedAt: now };
    return true;
  };

  const startScan = async (options?: { skipReadyCheck?: boolean }) => {
    const skipReadyCheck = options?.skipReadyCheck ?? false;

    if (!isBlePrinterModuleAvailable()) {
      Alert.alert(
        "Unsupported runtime",
        "Bluetooth printing requires a Development Build or production build. Expo Go is not supported."
      );
      return;
    }

    if (scanWatchdogRef.current) {
      clearTimeout(scanWatchdogRef.current);
      scanWatchdogRef.current = null;
    }

    setAvailablePrinters([]);
    setIsScanning(true);
    scanWatchdogRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsScanning(false);
        Alert.alert("Scan timeout", "Scanning is taking too long. Please tap Scan again.");
      }
    }, SCAN_WATCHDOG_TIMEOUT);

    try {
      if (!skipReadyCheck) {
        const ready = await ensureBluetoothReady();
        if (!ready) return;
      }

      try {
        await BLEPrinter.init();
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 300));
        await BLEPrinter.init();
      }

      const devices: any = await withTimeout(
        BLEPrinter.getDeviceList(),
        SCAN_TIMEOUT,
        "Printer scan timeout. Please try again."
      );

      if (!isMountedRef.current) return;

      if (!devices || devices.length === 0) {
        Alert.alert(
          "No paired printer",
          "Please pair your Bluetooth printer in system settings first, then tap Scan again."
        );
        return;
      }

      const mappedDevices: PrinterDevice[] = devices
        .map((d: any) => ({
          name: d.device_name || d.name || "Unknown printer",
          address: d.inner_mac_address || d.macAddress || d.address,
        }))
        .filter((d: PrinterDevice) => d.address);

      const lastAddress = lastPrinterAddressRef.current;
      const sortedDevices = [...mappedDevices].sort((a, b) => {
        if (a.address === lastAddress) return -1;
        if (b.address === lastAddress) return 1;
        return a.name.localeCompare(b.name);
      });

      setAvailablePrinters(sortedDevices);
    } catch (err: any) {
      if (!isMountedRef.current) return;

      const errorMessage = err?.message || "Cannot scan printers. Please try again.";
      const lowered = String(errorMessage).toLowerCase();

      if (lowered.includes("timeout")) {
        Alert.alert("Scan timeout", "Scanning took too long. Please try again.");
      } else if (lowered.includes("permission")) {
        Alert.alert("Permission required", "Please allow Bluetooth permission and retry.");
      } else {
        Alert.alert("Scan error", errorMessage);
      }
    } finally {
      if (scanWatchdogRef.current) {
        clearTimeout(scanWatchdogRef.current);
        scanWatchdogRef.current = null;
      }
      if (isMountedRef.current) {
        setIsScanning(false);
      }
    }
  };

  const printImage = (base64Image: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const result = (BLEPrinter as any).printImageBase64(base64Image, { imageWidth: 384 });

        if (result && typeof result.then === "function") {
          result.then(resolve).catch(reject);
        } else {
          setTimeout(() => resolve(), 2500);
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  const connectAndPrint = async (printer: PrinterDevice | null, invoiceToPrint?: InvoiceInfo | null) => {
    if (isPrinting) return;

    const targetInvoice = invoiceToPrint || currentInvoice;
    if (!targetInvoice) {
      Alert.alert("Error", "No invoice selected for printing.");
      return;
    }

    if (!printer?.address) {
      Alert.alert("Error", "Cannot connect to printer. Please check Bluetooth printer status.");
      return;
    }

    setIsPrinting(true);

    let isConnected = false;
    let isPrintedSuccessfully = false;

    try {
      await withTimeout(BLEPrinter.connectPrinter(printer.address), 10000, "Printer connection timeout.");
      isConnected = true;
      await new Promise((resolve) => setTimeout(resolve, 650));

      const base64Image = await withTimeout(
        generateBillImage(viewShotRef),
        IMAGE_GENERATION_TIMEOUT,
        "Bill image generation timeout."
      );

      if (!base64Image) {
        throw new Error("Cannot generate bill image. Print layout is not ready.");
      }

      try {
        await withTimeout(printImage(base64Image), PRINT_TIMEOUT, "Print timeout.");
        isPrintedSuccessfully = true;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await withTimeout(printImage(base64Image), PRINT_TIMEOUT, "Retry print timeout.");
        isPrintedSuccessfully = true;
      }

      if (isPrintedSuccessfully) {
        lastPrinterAddressRef.current = printer.address;
        showMessage({ message: "Print success", type: "success" });
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Unknown print error.";
      const lowered = String(errorMsg).toLowerCase();

      if (lowered.includes("timeout")) {
        Alert.alert("Print error", "Printing took too long. Please check printer and retry.");
      } else if (lowered.includes("connection") || lowered.includes("connect")) {
        Alert.alert("Connection error", "Cannot connect to printer. Please make sure printer is on.");
      } else if (lowered.includes("image")) {
        Alert.alert("Image error", errorMsg);
      } else {
        Alert.alert("Print error", errorMsg);
      }
    } finally {
      if (isConnected) {
        try {
          await BLEPrinter.closeConn();
        } catch {
          // no-op
        }
      }

      setIsPrinting(false);
      setShowPrinterManager(!isPrintedSuccessfully);
    }
  };

  const updateInvoice = (newInvoice: InvoiceInfo | null) => {
    setCurrentInvoice(newInvoice);
  };

  const handlePrintInvoice = async (invoiceToPrint?: InvoiceInfo | null) => {
    if (!isBlePrinterModuleAvailable()) {
      Alert.alert(
        "Unsupported runtime",
        "Bluetooth printing requires a Development Build or production build. Expo Go is not supported."
      );
      return;
    }

    if (isStartingRef.current || isScanning || isPrinting) {
      return;
    }

    const targetInvoice = invoiceToPrint || currentInvoice;
    if (!targetInvoice) {
      Alert.alert("No invoice", "Please select an invoice before printing.");
      return;
    }

    isStartingRef.current = true;

    try {
      setCurrentInvoice(targetInvoice);
      setShowPrinterManager(true);
      showMessage({ message: "Dang tim may in...", type: "info" });

      setTimeout(() => {
        if (isMountedRef.current) {
          startScan({ skipReadyCheck: false });
        }
      }, 120);
    } catch {
      Alert.alert("Error", "Unexpected error while starting print flow.");
    } finally {
      isStartingRef.current = false;
    }
  };

  return {
    handlePrintInvoice,
    updateInvoice,
    currentInvoice,
    isPrinting,
    printerModalProps: {
      visible: showPrinterManager,
      printers: availablePrinters,
      isScanning,
      isPrinting,
      currentInvoice,
      onClose: () => {
        if (!isPrinting) {
          setShowPrinterManager(false);
          isStartingRef.current = false;
        }
      },
      onScan: startScan,
      onSelectPrinter: connectAndPrint,
    },
  };
};

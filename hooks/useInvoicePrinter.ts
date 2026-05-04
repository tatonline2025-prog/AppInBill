import {
    isBluetoothEnabled,
    requestBluetoothPermissions,
} from "@/components/BluetoothPermission";
import { InvoiceInfo } from "@/types/invoice";
import { generateBillImage } from "@/utils/generateBillImage";
import { PRINTER_STORAGE_KEY } from "@/utils/printer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { showMessage } from "react-native-flash-message";
import { BLEPrinter } from "react-native-thermal-receipt-printer-image-qr";
import ViewShot from "react-native-view-shot";

interface PrinterDevice {
  name: string;
  address: string;
  paperWidthPx?: number; // 384 = 58mm, 576 = 80mm (default: 384)
}

const IMAGE_GENERATION_TIMEOUT = 12000;
const PRINT_TIMEOUT = 15000;
const READY_CACHE_TTL = 30000;

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
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceInfo | null>(invoice || null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLayoutVisible, setIsLayoutVisible] = useState(false);
  const [savedPrinter, setSavedPrinter] = useState<PrinterDevice | null>(null);
  const savedPrinterRef = useRef<PrinterDevice | null>(null);

  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const readyStateRef = useRef<{ isReady: boolean; checkedAt: number }>({
    isReady: false,
    checkedAt: 0,
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (invoice) setCurrentInvoice(invoice);
  }, [invoice]);

  // Load saved printer on mount
  useEffect(() => {
    loadSavedPrinter();
  }, []);

  const savePrinter = async (printer: PrinterDevice) => {
    try {
      const jsonValue = JSON.stringify(printer);
      await AsyncStorage.setItem(PRINTER_STORAGE_KEY, jsonValue);
      setSavedPrinter(printer);
      savedPrinterRef.current = printer;
      console.log('[PRINTER] Saved:', printer.name);
    } catch (e) {
      console.error('[PRINTER] Save error:', e);
    }
  };

  const loadSavedPrinter = async (): Promise<PrinterDevice | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (jsonValue) {
        const printer: PrinterDevice = JSON.parse(jsonValue);
        if (printer.name && printer.address) {
          setSavedPrinter(printer);
          savedPrinterRef.current = printer;
          console.log('[PRINTER] Loaded:', printer.name);
          return printer;
        }
      }
    } catch (e) {
      console.error('[PRINTER] Load error:', e);
    }
    setSavedPrinter(null);
    savedPrinterRef.current = null;
    return null;
  };

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

  const printImage = (base64Image: string, imageWidth: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const result = (BLEPrinter as any).printImageBase64(base64Image, { imageWidth });
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

      const imageWidth = printer.paperWidthPx ?? 384;

      // Make layout visible + wait for render before capture
      setIsLayoutVisible(true);
      await new Promise((resolve) => setTimeout(resolve, 1200)); // layout render + fonts
      await new Promise((resolve) => setTimeout(resolve, 0));    // next tick

      const base64Image = await withTimeout(
        generateBillImage(viewShotRef),
        IMAGE_GENERATION_TIMEOUT,
        "Bill image generation timeout."
      );

      setIsLayoutVisible(false);

      if (!base64Image) {
        console.error("[PRINT] Capture failed. Ref ready?", !!viewShotRef.current);
        throw new Error("Cannot generate bill image. Layout ref or capture failed.");
      }
      console.log("[PRINT] Captured success, base64 length:", base64Image.length);

      try {
        await withTimeout(printImage(base64Image, imageWidth), PRINT_TIMEOUT, "Print timeout.");
        isPrintedSuccessfully = true;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await withTimeout(printImage(base64Image, imageWidth), PRINT_TIMEOUT, "Retry print timeout.");
        isPrintedSuccessfully = true;
      }

      if (isPrintedSuccessfully) {
        lastPrinterAddressRef.current = printer.address;
        // Persist printer selection
        await savePrinter(printer);
        showMessage({ message: "In thành công! Đã lưu máy in.", type: "success" });
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Unknown print error.";
      const lowered = String(errorMsg).toLowerCase();

      if (lowered.includes("timeout")) {
        Alert.alert("Print error", "Printing took too long. Please check printer and retry.");
      } else if (lowered.includes("connection") || lowered.includes("connect")) {
        Alert.alert("Connection error", "Cannot connect to printer. Please make sure printer is on.");
      } else if (lowered.includes("image") || lowered.includes("capture")) {
        Alert.alert("Image error", errorMsg);
      } else {
        Alert.alert("Print error", errorMsg);
      }
    } finally {
      setIsLayoutVisible(false);

      if (isConnected) {
        try {
          await BLEPrinter.closeConn();
        } catch {
          // no-op
        }
      }

      setIsPrinting(false);
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

    if (isStartingRef.current || isPrinting) return;

    const targetInvoice = invoiceToPrint || currentInvoice;
    if (!targetInvoice) {
      Alert.alert("Không có hóa đơn", "Chọn hóa đơn trước khi in.");
      return;
    }

    isStartingRef.current = true;
    try {
      setCurrentInvoice(targetInvoice);

      // Load saved printer config (set in tab Tài khoản)
      let printer = savedPrinterRef.current || savedPrinter;
      if (!printer) printer = await loadSavedPrinter();

      if (!printer) {
        Alert.alert(
          "Chưa cấu hình máy in",
          "Vào tab Tài khoản → Máy in để chọn và test in máy in trước."
        );
        return;
      }

      await connectAndPrint(printer, targetInvoice);
    } catch {
      Alert.alert("Lỗi", "Có lỗi không mong đợi khi bắt đầu in.");
    } finally {
      isStartingRef.current = false;
    }
  };

  return {
    handlePrintInvoice,
    updateInvoice,
    currentInvoice,
    isPrinting,
    isLayoutVisible,
    paperWidthPx: savedPrinterRef.current?.paperWidthPx ?? 384,
    // printerModalProps kept for backward-compat (visible always false — printer config moved to account tab)
    printerModalProps: {
      visible: false as const,
      printers: [] as PrinterDevice[],
      isScanning: false,
      isPrinting,
      isLayoutVisible,
      savedPrinter,
      currentInvoice,
      onClose: () => {},
      onScan: () => {},
      onSelectPrinter: connectAndPrint,
    },
  };
};

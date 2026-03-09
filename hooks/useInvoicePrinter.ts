import { isBluetoothEnabled, requestBluetoothPermissions } from "@/components/BluetoothPermission";
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

// Timeout when scanning for printers (ms)
const SCAN_TIMEOUT = 5000;
// Timeout when generating image (ms)
const IMAGE_GENERATION_TIMEOUT = 8000;
// Timeout when printing (ms)
const PRINT_TIMEOUT = 15000;

export const useInvoicePrinter = (
  viewShotRef: React.RefObject<ViewShot | null>,
  invoice: InvoiceInfo | null
) => {
  const [showPrinterManager, setShowPrinterManager] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<PrinterDevice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceInfo | null>(invoice || null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Ref to track if currently processing print
  const isProcessingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (invoice) setCurrentInvoice(invoice);
  }, [invoice]);

  // Timeout helper function
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  };

  const startScan = async () => {
    setAvailablePrinters([]);
    setIsScanning(true);

    try {
      // Check Bluetooth permissions before scanning
      const hasPermission = await requestBluetoothPermissions();
      if (!hasPermission) {
        setIsScanning(false);
        return;
      }

      // Check if Bluetooth is enabled
      const btEnabled = await isBluetoothEnabled();
      if (!btEnabled) {
        Alert.alert(
          "Bluetooth chưa bật",
          "Vui lòng bật Bluetooth và thử lại."
        );
        setIsScanning(false);
        return;
      }

      console.log("Bắt đầu quét máy in...");

      // Initialize BLE Printer
      try {
        await BLEPrinter.init();
      } catch (initErr) {
        console.error("Lỗi khởi tạo BLEPrinter:", initErr);
        // Try init again
        await new Promise(resolve => setTimeout(resolve, 500));
        await BLEPrinter.init();
      }

      // Scan for printers with timeout
      const devices: any = await withTimeout(
        BLEPrinter.getDeviceList(),
        SCAN_TIMEOUT,
        "Quét máy in quá thời gian. Vui lòng thử lại."
      );

      if (!isMountedRef.current) return;

      if (!devices || devices.length === 0) {
        Alert.alert(
          "Không tìm thấy máy in",
          "Đảm bảo máy in đã bật và ở gần thiết bị."
        );
        setIsScanning(false);
        return;
      }

      console.log("Tìm thấy", devices.length, "thiết bị");

      // Map devices
      const mappedDevices: PrinterDevice[] = devices.map((d: any) => ({
        name: d.device_name || d.name || "Máy in không tên",
        address: d.inner_mac_address || d.macAddress || d.address,
      })).filter((d: PrinterDevice) => d.address);

      console.log("Danh sách máy in:", mappedDevices);
      setAvailablePrinters(mappedDevices);

    } catch (err: any) {
      console.error("Lỗi khi quét máy in:", err);
      
      if (!isMountedRef.current) return;

      const errorMessage = err?.message || "Không thể tìm kiếm máy in. Vui lòng thử lại.";
      
      if (errorMessage.includes("timeout")) {
        Alert.alert("Quét timeout", "Mất quá nhiều thời gian để tìm máy in. Vui lòng thử lại.");
      } else if (errorMessage.includes("permission") || errorMessage.includes("quyền")) {
        Alert.alert("Thiếu quyền", "Vui lòng cấp quyền Bluetooth và thử lại.");
      } else {
        Alert.alert("Lỗi quét máy in", errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
      }
    }
  };

  // Print function with Promise wrapper since library returns void
  const printImage = (base64Image: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const result = (BLEPrinter as any).printImageBase64(base64Image, { imageWidth: 384 });
        
        if (result && typeof result.then === 'function') {
          result
            .then(resolve)
            .catch(reject);
        } else {
          setTimeout(() => {
            console.log("In hoàn tất (timeout-based)");
            resolve();
          }, 3000);
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  const connectAndPrint = async (
    printer: PrinterDevice | null,
    invoiceToPrint?: InvoiceInfo | null
  ) => {
    const targetInvoice = invoiceToPrint || currentInvoice;
    
    console.log("=== CONNECT AND PRINT ===");
    console.log("printer:", printer?.name);
    console.log("printer address:", printer?.address);
    console.log("invoiceToPrint:", invoiceToPrint?._id);
    console.log("currentInvoice:", currentInvoice?._id);
    console.log("targetInvoice:", targetInvoice?._id);
    
    if (!targetInvoice) {
      Alert.alert("Lỗi", "Không có hóa đơn để in. Vui lòng chọn hóa đơn trước.");
      return;
    }

    if (!printer?.address) {
      Alert.alert(
        "Lỗi",
        "Không thể kết nối với máy in. Hãy đảm bảo máy in đã bật và đã pair Bluetooth."
      );
      return;
    }

    setIsPrinting(true);
    let isConnected = false;

    try {
      // Step 1: Connect to printer
      console.log("Đang kết nối đến máy in:", printer.address);
      
      await withTimeout(
        BLEPrinter.connectPrinter(printer.address),
        10000,
        "Kết nối máy in quá thời gian."
      );
      
      isConnected = true;
      console.log("Đã kết nối, đang tạo ảnh bill...");

      // Wait for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Generate image from bill
      const base64Image = await withTimeout(
        generateBillImage(viewShotRef),
        IMAGE_GENERATION_TIMEOUT,
        "Tạo ảnh bill quá thời gian."
      );
      
      console.log("Base64 image generated, length:", base64Image?.length);
      
      if (!base64Image) {
        throw new Error("Không thể tạo ảnh bill. Vui lòng thử lại.");
      }

      // Step 3: Print image
      console.log("Đang in ảnh...");
      
      try {
        await withTimeout(
          printImage(base64Image),
          PRINT_TIMEOUT,
          "In mất quá nhiều thời gian."
        );
        console.log("In thành công!");
        showMessage({ message: "In hóa đơn thành công!", type: "success" });
      } catch (printErr: any) {
        console.log("In lần đầu thất bại, thử lại...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          await withTimeout(
            printImage(base64Image),
            PRINT_TIMEOUT,
            "In lần 2 quá thời gian."
          );
          console.log("In lần 2 thành công!");
          showMessage({ message: "In hóa đơn thành công!", type: "success" });
        } catch (retryErr) {
          throw retryErr;
        }
      }

    } catch (err: any) {
      console.error("Lỗi in hóa đơn:", err);
      
      const errorMsg = err?.message || "Đã xảy ra lỗi không xác định khi in hóa đơn.";
      
      if (errorMsg.includes("timeout")) {
        Alert.alert("Lỗi in", "In mất quá nhiều thời gian. Vui lòng kiểm tra máy in và thử lại.");
      } else if (errorMsg.includes("connection") || errorMsg.includes("kết nối")) {
        Alert.alert("Lỗi kết nối", "Không thể kết nối với máy in. Vui lòng kiểm tra máy in đã bật chưa.");
      } else if (errorMsg.includes("Không thể tạo ảnh")) {
        Alert.alert("Lỗi tạo ảnh", errorMsg);
      } else {
        Alert.alert("Lỗi in hóa đơn", errorMsg);
      }
    } finally {
      // Close connection
      if (isConnected) {
        try {
          console.log("Đóng kết nối máy in...");
          await BLEPrinter.closeConn();
        } catch (e) {
          console.warn("Lỗi đóng kết nối máy in:", e);
        }
      }
      setIsPrinting(false);
      setShowPrinterManager(false);
    }
  };

  const updateInvoice = (newInvoice: InvoiceInfo | null) => {
    setCurrentInvoice(newInvoice);
  };

  const handlePrintInvoice = async (invoiceToPrint?: InvoiceInfo | null) => {
    // Prevent multiple simultaneous calls
    if (isProcessingRef.current) {
      console.log(">>> handlePrintInvoice: Already processing, ignoring duplicate call");
      return;
    }
    
    const targetInvoice = invoiceToPrint || currentInvoice;
    if (!targetInvoice) {
      Alert.alert("Chưa có hóa đơn", "Vui lòng tìm hóa đơn trước khi in.");
      return;
    }

    // Mark as processing
    isProcessingRef.current = true;
    console.log(">>> handlePrintInvoice: Starting, invoiceId:", targetInvoice._id);
    
    try {
      // Step 1: Check Bluetooth permissions
      console.log(">>> Step 1: Checking Bluetooth permissions...");
      const hasPermission = await requestBluetoothPermissions();
      if (!hasPermission) {
        console.log(">>> User did not grant Bluetooth permission");
        isProcessingRef.current = false;
        return;
      }
      console.log(">>> Step 1: Bluetooth permission granted");

      // Step 2: Check if Bluetooth is enabled
      console.log(">>> Step 2: Checking if Bluetooth is enabled...");
      const btEnabled = await isBluetoothEnabled();
      if (!btEnabled) {
        Alert.alert(
          "Bluetooth chưa bật",
          "Vui lòng bật Bluetooth để in hóa đơn."
        );
        console.log(">>> Step 2: Bluetooth is not enabled");
        isProcessingRef.current = false;
        return;
      }
      console.log(">>> Step 2: Bluetooth is enabled");

      // Step 3: Initialize BLE Printer
      console.log(">>> Step 3: Initializing BLE Printer...");
      try {
        await BLEPrinter.init();
        console.log(">>> Step 3: BLE Printer initialized successfully");
      } catch (err: any) {
        console.error(">>> Step 3: BLEPrinter init error:", err);
        
        // Try init again after waiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          await BLEPrinter.init();
          console.log(">>> Step 3: BLE Printer init retry successful");
        } catch (retryErr: any) {
          console.error(">>> Step 3: BLEPrinter init retry error:", retryErr);
          Alert.alert(
            "Lỗi khởi tạo máy in", 
            "Không thể khởi tạo Bluetooth. Vui lòng thử lại.\n\nChi tiết: " + (retryErr?.message || "Lỗi không xác định")
          );
          isProcessingRef.current = false;
          return;
        }
      }

      // Step 4: Update invoice and show modal
      console.log(">>> Step 4: Showing printer selection modal");
      setCurrentInvoice(targetInvoice);
      setShowPrinterManager(true);
      
      console.log(">>> handlePrintInvoice: Completed successfully, modal should be visible");
      
    } catch (error) {
      console.error(">>> handlePrintInvoice: Unexpected error:", error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi không xác định.");
      isProcessingRef.current = false;
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
        }
      },
      onScan: startScan,
      onSelectPrinter: connectAndPrint,
    },
  };
};


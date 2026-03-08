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

// Timeout khi quét máy in (ms)
const SCAN_TIMEOUT = 5000;
// Timeout khi tạo ảnh (ms)
const IMAGE_GENERATION_TIMEOUT = 8000;
// Timeout khi in (ms)
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (invoice) setCurrentInvoice(invoice);
  }, [invoice]);

  // Hàm timeout helper
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
      // Kiểm tra quyền Bluetooth trước khi quét
      const hasPermission = await requestBluetoothPermissions();
      if (!hasPermission) {
        setIsScanning(false);
        return;
      }

      // Kiểm tra Bluetooth đã bật chưa
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

      // Khởi tạo BLE Printer
      try {
        await BLEPrinter.init();
      } catch (initErr) {
        console.error("Lỗi khởi tạo BLEPrinter:", initErr);
        // Thử init lại
        await new Promise(resolve => setTimeout(resolve, 500));
        await BLEPrinter.init();
      }

      // Quét máy in với timeout
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

      // Map thiết bị
      const mappedDevices: PrinterDevice[] = devices.map((d: any) => ({
        name: d.device_name || d.name || "Máy in không tên",
        address: d.inner_mac_address || d.macAddress || d.address,
      })).filter((d: PrinterDevice) => d.address); // Lọc bỏ thiết bị không có địa chỉ

      console.log("Danh sách máy in:", mappedDevices);
      setAvailablePrinters(mappedDevices);

    } catch (err: any) {
      console.error("Lỗi khi quét máy in:", err);
      
      if (!isMountedRef.current) return;

      // Hiển thị thông báo lỗi chi tiết hơn
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

  // Hàm in với Promise wrapper vì thư viện trả về void
  const printImage = (base64Image: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Gọi hàm in - ép kiểu sang any vì thư viện trả về void nhưng thực tế có thể có callback
        const result = (BLEPrinter as any).printImageBase64(base64Image, { imageWidth: 384 });
        
        // Nếu trả về Promise (trong một số phiên bản)
        if (result && typeof result.then === 'function') {
          result
            .then(resolve)
            .catch(reject);
        } else {
          // Nếu không trả về gì, coi như thành công sau một khoảng thời gian
          // Đây là fallback vì thư viện trả về void
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
    // Ưu tiên: invoiceToPrint (nếu được truyền) > currentInvoice > targetInvoice
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
      // Bước 1: Kết nối máy in
      console.log("Đang kết nối đến máy in:", printer.address);
      
      await withTimeout(
        BLEPrinter.connectPrinter(printer.address),
        10000,
        "Kết nối máy in quá thời gian."
      );
      
      isConnected = true;
      console.log("Đã kết nối, đang tạo ảnh bill...");

      // Đợi một chút để kết nối ổn định
      await new Promise(resolve => setTimeout(resolve, 500));

      // Bước 2: Tạo ảnh từ bill
      const base64Image = await withTimeout(
        generateBillImage(viewShotRef),
        IMAGE_GENERATION_TIMEOUT,
        "Tạo ảnh bill quá thời gian."
      );
      
      console.log("Base64 image generated, length:", base64Image?.length);
      
      if (!base64Image) {
        throw new Error("Không thể tạo ảnh bill. Vui lòng thử lại.");
      }

      // Bước 3: In ảnh
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
        // Thử in lại một lần nữa nếu lỗi
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
      
      // Phân loại lỗi để hiển thị thông báo phù hợp
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
      // Đóng kết nối
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
    const targetInvoice = invoiceToPrint || currentInvoice;
    if (!targetInvoice) {
      Alert.alert("Chưa có hóa đơn", "Vui lòng tìm hóa đơn trước khi in.");
      return;
    }

    // Bước 1: Kiểm tra quyền Bluetooth trước
    console.log("Đang kiểm tra quyền Bluetooth...");
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      console.log("Người dùng chưa cấp quyền Bluetooth");
      return;
    }
    console.log("Đã có quyền Bluetooth");

    // Bước 2: Kiểm tra Bluetooth đã bật chưa
    console.log("Đang kiểm tra Bluetooth...");
    const btEnabled = await isBluetoothEnabled();
    if (!btEnabled) {
      Alert.alert(
        "Bluetooth chưa bật",
        "Vui lòng bật Bluetooth để in hóa đơn."
      );
      console.log("Bluetooth chưa bật");
      return;
    }
    console.log("Bluetooth đã bật");

    // Bước 3: Khởi tạo BLE Printer
    console.log("Đang khởi tạo BLE Printer...");
    try {
      await BLEPrinter.init();
      console.log("BLE Printer đã khởi tạo");
    } catch (err) {
      console.error("Lỗi khởi tạo BLEPrinter:", err);
      
      // Thử init lại sau khi chờ
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        await BLEPrinter.init();
        console.log("BLE Printer init lần 2 thành công");
      } catch (retryErr) {
        console.error("Lỗi retry khởi tạo BLEPrinter:", retryErr);
        Alert.alert("Lỗi", "Không thể khởi tạo Bluetooth. Vui lòng thử lại.");
        return;
      }
    }

    // Bước 4: Cập nhật invoice và hiển thị modal
    console.log("Hiển thị modal chọn máy in");
    setCurrentInvoice(targetInvoice);
    setShowPrinterManager(true);
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


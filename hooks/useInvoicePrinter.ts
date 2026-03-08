import { requestBluetoothPermissions } from "@/components/BluetoothPermission";
import { InvoiceInfo } from "@/types/invoice";
import { generateBillImage } from "@/utils/generateBillImage";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { showMessage } from "react-native-flash-message";
import { BLEPrinter } from "react-native-thermal-receipt-printer-image-qr";
import ViewShot from "react-native-view-shot";

interface PrinterDevice {
  name: string;
  address: string;
}

export const useInvoicePrinter = (
  viewShotRef: React.RefObject<ViewShot | null>,
  invoice: InvoiceInfo | null
) => {
  const [showPrinterManager, setShowPrinterManager] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<PrinterDevice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<InvoiceInfo | null>(invoice || null);

  useEffect(() => {
    if (invoice) setCurrentInvoice(invoice);
  }, [invoice]);

  const startScan = async () => {
    setAvailablePrinters([]);
    setIsScanning(true);

    const timeoutPromise = (timeoutMs: number) =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Scan timeout after ${timeoutMs}ms`)), timeoutMs)
      );

    try {
      const devices: any = await Promise.race([BLEPrinter.getDeviceList(), timeoutPromise(3000)]);
      const mappedDevices: PrinterDevice[] = devices.map((d: any) => ({
        name: d.device_name || "Khong ten",
        address: d.inner_mac_address,
      }));
      setAvailablePrinters(mappedDevices);
    } catch (err) {
      console.error("Loi khi quet may in:", err);
      Alert.alert("Loi quet", "Khong tim thay may in. Vui long thu lai.");
    } finally {
      setIsScanning(false);
    }
  };

  const connectAndPrint = async (
    printer: PrinterDevice | null,
    invoiceToPrint?: InvoiceInfo | null
  ) => {
    // Ưu tiên: invoiceToPrint (nếu được truyền) > currentInvoice > targetInvoice
    const targetInvoice = invoiceToPrint || currentInvoice;
    
    console.log("=== CONNECT AND PRINT ===");
    console.log("printer:", printer?.name);
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

    let isConnected = false;

    try {
      console.log("Connecting to printer:", printer.address);
      await BLEPrinter.connectPrinter(printer.address);
      isConnected = true;
      console.log("Connected, generating bill image...");

      const base64Image = await generateBillImage(viewShotRef);
      console.log("Base64 image generated, length:", base64Image?.length);
      
      if (!base64Image) throw new Error("Không thể tạo ảnh bill");

      console.log("Printing image...");
      await BLEPrinter.printImageBase64(base64Image, { imageWidth: 384 });
      console.log("Print completed!");
      
      showMessage({ message: "In hóa đơn thành công!", type: "success" });
    } catch (err: any) {
      console.error("Lỗi in hóa đơn:", err);
      const errorMsg = err?.message || "Đã xảy ra lỗi không xác định khi in hóa đơn.";
      Alert.alert("Lỗi", errorMsg);
    } finally {
      if (isConnected) {
        try {
          await BLEPrinter.closeConn();
        } catch (e) {
          console.warn("Lỗi đóng kết nối máy in:", e);
        }
      }
      setShowPrinterManager(false);
    }
  };

  const updateInvoice = (newInvoice: InvoiceInfo | null) => {
    setCurrentInvoice(newInvoice);
  };

  const handlePrintInvoice = async (invoiceToPrint?: InvoiceInfo | null) => {
    const targetInvoice = invoiceToPrint || currentInvoice;
    if (!targetInvoice) {
      Alert.alert("Chua co hoa don", "Vui long tim hoa don truoc khi in.");
      return;
    }

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert("Thieu quyen", "Vui long cap quyen Bluetooth de in.");
      return;
    }

    try {
      await BLEPrinter.init();
    } catch (err) {
      console.error("Loi khoi tao BLEPrinter:", err);
      Alert.alert("Loi", "Khong the khoi tao Bluetooth. Vui long thu lai.");
      return;
    }

    setCurrentInvoice(targetInvoice);
    setShowPrinterManager(true);
  };

  return {
    handlePrintInvoice,
    updateInvoice,
    currentInvoice,
    printerModalProps: {
      visible: showPrinterManager,
      printers: availablePrinters,
      isScanning,
      currentInvoice,
      onClose: () => setShowPrinterManager(false),
      onScan: startScan,
      onSelectPrinter: connectAndPrint,
    },
  };
};

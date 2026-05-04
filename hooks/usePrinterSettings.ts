import {
    isBluetoothEnabled,
    requestBluetoothPermissions,
} from "@/components/BluetoothPermission";
import { generateBillImage } from "@/utils/generateBillImage";
import { PRINTER_STORAGE_KEY } from "@/utils/printer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { showMessage } from "react-native-flash-message";
import { BLEPrinter } from "react-native-thermal-receipt-printer-image-qr";
import ViewShot from "react-native-view-shot";

export interface PrinterDevice {
  name: string;
  address: string;
  paperWidthPx?: number; // 384 = 58mm, 576 = 80mm
}

const SCAN_TIMEOUT = 6000;
const PRINT_TIMEOUT = 15000;

/** Nhận diện khổ giấy theo tên máy in. Trả null nếu không nhận ra. */
const detectWidthFromName = (name: string): 384 | 576 | null => {
  const n = name.toUpperCase();
  if (
    n.includes("BIXOLON") ||
    n.includes("SPP-R") ||
    n.includes("SPP_R") ||
    n.includes("80MM") ||
    n.includes("80 MM")
  )
    return 576; // 80mm
  if (
    n.includes("PT-") ||
    n.includes("PT_") ||
    n.startsWith("PT") ||
    n.includes("RPP") ||
    n.includes("58MM") ||
    n.includes("58 MM")
  )
    return 384; // 58mm
  return null; // Không nhận ra
};

const withTimeout = <T,>(promise: Promise<T>, ms: number, msg: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);

const doPrintImage = (base64: string, imageWidth: number): Promise<void> =>
  new Promise((resolve, reject) => {
    try {
      const result = (BLEPrinter as any).printImageBase64(base64, { imageWidth });
      if (result && typeof result.then === "function") {
        result.then(resolve).catch(reject);
      } else {
        setTimeout(resolve, 2500);
      }
    } catch (e) {
      reject(e);
    }
  });

/**
 * Hook quản lý cấu hình máy in trong tab Tài khoản.
 * - Quét máy in Bluetooth
 * - Chọn máy in + khổ giấy
 * - Test in thử (capture ảnh xem trước) + lưu cấu hình
 * - Xóa cấu hình
 */
export const usePrinterSettings = (testViewShotRef: React.RefObject<ViewShot | null>) => {
  const [savedPrinter, setSavedPrinter] = useState<PrinterDevice | null>(null);
  const [availablePrinters, setAvailablePrinters] = useState<PrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null);
  const [selectedWidthPx, setSelectedWidthPx] = useState<384 | 576>(384);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadSaved();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadSaved = async () => {
    try {
      const json = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (json) {
        const p: PrinterDevice = JSON.parse(json);
        if (p.name && p.address) {
          if (isMountedRef.current) {
            setSavedPrinter(p);
            setSelectedPrinter(p);
            if (p.paperWidthPx === 384 || p.paperWidthPx === 576) {
              setSelectedWidthPx(p.paperWidthPx);
            }
          }
        }
      }
    } catch {}
  };

  const clearPrinter = async () => {
    await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
    if (isMountedRef.current) {
      setSavedPrinter(null);
      setSelectedPrinter(null);
    }
    showMessage({ message: "Đã xóa cấu hình máy in.", type: "info" });
  };

  const scan = async () => {
    setAvailablePrinters([]);
    setIsScanning(true);
    try {
      const hasPermission = await requestBluetoothPermissions();
      if (!hasPermission) {
        Alert.alert("Cần quyền Bluetooth", "Vui lòng cho phép quyền Bluetooth để quét máy in.");
        return;
      }
      const btEnabled = await isBluetoothEnabled();
      if (!btEnabled) {
        Alert.alert("Bluetooth chưa bật", "Vui lòng bật Bluetooth và thử lại.");
        return;
      }

      try {
        await BLEPrinter.init();
      } catch {
        await new Promise((r) => setTimeout(r, 300));
        await BLEPrinter.init();
      }

      const devices: any = await withTimeout(
        BLEPrinter.getDeviceList(),
        SCAN_TIMEOUT,
        "Quét quá thời gian. Vui lòng thử lại."
      );

      if (!devices?.length) {
        Alert.alert(
          "Không tìm thấy máy in",
          "Hãy ghép đôi (pair) máy in trong Cài đặt Bluetooth của điện thoại trước, rồi quét lại."
        );
        return;
      }

      const mapped: PrinterDevice[] = devices
        .map((d: any) => ({
          name: d.device_name || d.name || "Máy in không tên",
          address: d.inner_mac_address || d.macAddress || d.address,
        }))
        .filter((d: PrinterDevice) => !!d.address);

      if (isMountedRef.current) setAvailablePrinters(mapped);
    } catch (err: any) {
      Alert.alert("Lỗi quét", err?.message || "Không thể quét máy in. Thử lại sau.");
    } finally {
      if (isMountedRef.current) setIsScanning(false);
    }
  };

  /**
   * Kết nối máy in đã chọn → in ảnh xem trước → ngắt kết nối → lưu cấu hình.
   */
  const testAndSave = async () => {
    if (!selectedPrinter?.address) {
      Alert.alert("Chưa chọn máy in", "Quét và chọn một máy in trong danh sách trước.");
      return;
    }

    setIsTesting(true);
    let connected = false;

    try {
      await withTimeout(
        BLEPrinter.connectPrinter(selectedPrinter.address),
        10000,
        "Kết nối máy in quá thời gian. Kiểm tra máy in đang bật."
      );
      connected = true;

      // Chờ một chút để máy in sẵn sàng
      await new Promise((r) => setTimeout(r, 800));

      // Capture ảnh xem trước (layout luôn hiển thị trong tab Tài khoản)
      const base64 = await generateBillImage(testViewShotRef, 10000);
      if (!base64) throw new Error("Không chụp được ảnh mẫu. Thử lại.");

      await withTimeout(
        doPrintImage(base64, selectedWidthPx),
        PRINT_TIMEOUT,
        "In quá thời gian. Kiểm tra kết nối máy in."
      );

      // Lưu cấu hình
      const printerToSave: PrinterDevice = { ...selectedPrinter, paperWidthPx: selectedWidthPx };
      await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printerToSave));

      if (isMountedRef.current) {
        setSavedPrinter(printerToSave);
        showMessage({
          message: "Test in thành công! Đã lưu cấu hình máy in.",
          type: "success",
        });
      }
    } catch (err: any) {
      const msg = err?.message || "Không thể test in.";
      Alert.alert("Lỗi test in", msg);
    } finally {
      if (connected) {
        try {
          await BLEPrinter.closeConn();
        } catch {}
      }
      if (isMountedRef.current) setIsTesting(false);
    }
  };

  /** Chọn máy in và tự động nhận diện khổ giấy theo tên */
  const selectPrinter = (p: PrinterDevice) => {
    setSelectedPrinter(p);
    const detected = detectWidthFromName(p.name);
    if (detected !== null) {
      setSelectedWidthPx(detected);
    } else {
      // Không nhận ra loại máy → đề nghị người dùng chọn
      Alert.alert(
        "Chọn khổ giấy",
        `Không nhận ra loại máy "${p.name}".\nVui lòng chọn khổ giấy phù hợp:`,
        [
          {
            text: "PT · 58mm",
            onPress: () => setSelectedWidthPx(384),
          },
          {
            text: "Bixolon · 80mm",
            onPress: () => setSelectedWidthPx(576),
          },
        ],
        { cancelable: false }
      );
    }
  };

  return {
    savedPrinter,
    availablePrinters,
    isScanning,
    isTesting,
    selectedPrinter,
    selectedWidthPx,
    setSelectedPrinter,
    selectPrinter,
    setSelectedWidthPx,
    scan,
    testAndSave,
    clearPrinter,
    refreshSaved: loadSaved,
  };
};

// src/utils/printer.ts
import { PixelRatio } from "react-native";

// === HẰNG SỐ VÀ UTILS CHO VIỆC IN ===
const PRINTER_PIXEL_WIDTH = 384;
const screenDensity = PixelRatio.get();
export const viewShotWidthInDp = PRINTER_PIXEL_WIDTH / screenDensity;

// export const normalizeFont = (size: number) => {
//   const normalizedSize = size / PixelRatio.getFontScale();

//   return normalizedSize;
// };

export const now = new Date();
export const day = String(now.getDate()).padStart(2, "0");
export const month = String(now.getMonth() + 1).padStart(2, "0");

// Chuyển đổi số thành chữ (giữ nguyên logic gốc)
export const numberToVietnameseWords = (number: number): string => {
  if (isNaN(number)) return "";
  if (number === 0) return "không";

  const dv = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const cs = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  const readTriple = (num: number, full: boolean): string => {
    let str = "";
    const tram = Math.floor(num / 100);
    const chuc = Math.floor((num % 100) / 10);
    const donvi = num % 10;

    if (tram > 0) {
      str += cs[tram] + " trăm ";
      if (chuc === 0 && donvi > 0) str += "lẻ ";
    }

    if (chuc > 1) {
      str += cs[chuc] + " mươi ";
      if (donvi === 1) str += "mốt ";
      else if (donvi === 5) str += "lăm ";
      else if (donvi > 0) str += cs[donvi] + " ";
    } else if (chuc === 1) {
      str += "mười ";
      if (donvi === 1) str += "một ";
      else if (donvi === 5) str += "lăm ";
      else if (donvi > 0) str += cs[donvi] + " ";
    } else if (chuc === 0 && donvi > 0) {
      str += cs[donvi] + " ";
    }
    return str.trim();
  };

  let n = Math.floor(number);
  let i = 0;
  let full = false;
  const arr: string[] = [];

  while (n > 0) {
    const triple = n % 1000;
    const prefix = readTriple(triple, full || (i > 0 && triple < 100));
    if (triple > 0) {
      arr.unshift(prefix + (dv[i] ? " " + dv[i] : ""));
      full = true;
    }
    n = Math.floor(n / 1000);
    i++;
  }
  const result = arr.join(" ").replace(/\s+/g, " ").trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
};

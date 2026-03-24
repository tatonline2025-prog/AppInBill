/**
 * Hàm rút gọn mã khách hàng: PB0709001234 -> PB071234 (bỏ phần 0900)
 * Matches uncollected tab exactly
 */
export const shortenCustomerCode = (code: string): string => {
  if (!code) return "";
  // Tìm và thay thế phần "0900" ở giữa
  // Ví dụ: PB0709001234 -> PB071234
  return code.replace(/0900/, "...");
};

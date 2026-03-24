export const VN_TIMEZONE = "Asia/Ho_Chi_Minh";
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const pad2 = (value: number) => String(value).padStart(2, "0");

const toVietnamClock = (date: Date) => new Date(date.getTime() + VN_OFFSET_MS);

export const toVietnamDateKey = (date: Date) => {
  const vn = toVietnamClock(date);
  const year = vn.getUTCFullYear();
  const month = pad2(vn.getUTCMonth() + 1);
  const day = pad2(vn.getUTCDate());
  return `${year}-${month}-${day}`;
};

export const toVietnamISOString = (date: Date = new Date()) => {
  const vn = toVietnamClock(date);
  const year = vn.getUTCFullYear();
  const month = pad2(vn.getUTCMonth() + 1);
  const day = pad2(vn.getUTCDate());
  const hours = pad2(vn.getUTCHours());
  const minutes = pad2(vn.getUTCMinutes());
  const seconds = pad2(vn.getUTCSeconds());

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;
};

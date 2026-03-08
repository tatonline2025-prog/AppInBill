# TODO: Sửa lỗi chức năng in bill trên Android

## Mục tiêu
Đảm bảo chức năng in bill hoạt động với tất cả các loại thiết bị Android đã kết nối với máy in

## Trạng thái: HOÀN THÀNH ✅

## Các bước đã thực hiện

### Bước 1: Cập nhật BluetoothPermission.tsx ✅
- Kiểm tra Bluetooth đã bật chưa trước khi yêu cầu quyền
- Xử lý đúng quyền cho từng phiên bản Android (10, 11, 12, 13, 14)
- Thêm hàm `isBluetoothEnabled()` để kiểm tra nhanh
- Xử lý lỗi graceful

### Bước 2: Cập nhật useInvoicePrinter.ts ✅
- Thêm timeout cho các thao tác (quét: 5s, tạo ảnh: 8s, in: 15s)
- Thêm retry tự động khi in thất bại (2 lần)
- Cải thiện xử lý lỗi chi tiết với thông báo cụ thể
- Kiểm tra Bluetooth đã bật chưa trước khi in
- Thêm prop `isPrinting` để theo dõi trạng thái in
- Thêm console.log để debug

### Bước 3: Cập nhật PrinterModal.tsx ✅
- Hiển thị trạng thái đang in
- Vô hiệu hóa nút đóng khi đang in

### Bước 4: Cập nhật generateBillImage.ts ✅
- Thêm timeout để tránh treo vĩnh viễn
- Kiểm tra ref tồn tại trước khi chụp ảnh

### Bước 5: Cập nhật InvoiceLayout.tsx (QUAN TRỌNG) ✅
- Sửa ViewShot style: dùng `width: 1, height: 1, overflow: hidden` thay vì `opacity: 0`
- Thêm `snapshotContentContainer: true` vào ViewShot options
- Thêm `collapsable={false}` vào View bên trong

### Bước 6: Cập nhật collected.tsx ✅
- Cải thiện flow in với async/await đúng cách
- Đợi layout render xong trước khi in

## Flow hoạt động sau khi sửa:
1. Người dùng bấm nút "In biên nhận"
2. Kiểm tra quyền Bluetooth → Xin quyền nếu cần
3. Kiểm tra Bluetooth đã bật chưa → Yêu cầu bật nếu chưa
4. Khởi tạo BLE Printer
5. Hiển thị modal chọn máy in
6. Người dùng chọn máy in
7. Kết nối → Tạo ảnh → In (có retry nếu thất bại)
8. Hiển thị thông báo kết quả

## Cần làm:
1. Build lại ứng dụng: `npx expo run:android`
2. Test trên thiết bị thực
3. Kiểm tra log console để debug nếu cần


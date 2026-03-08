// src/components/InvoiceLayouts.tsx
import { InvoiceInfo } from "@/types/invoice";
import React, { ForwardedRef, JSX } from "react";
import { View } from "react-native";
import ViewShot from "react-native-view-shot";

// Tách ra từ file utils
import { viewShotWidthInDp } from "@/utils/printer";
// Tách ra từ file types
import { InvoiceLayoutItem } from "@/types/invoice-layout";
// Tách ra từ file components
import {
  BillBillingPeriod,
  BillCollectionFee,
  BillCollectorName,
  BillCollectorPhone,
  BillCollectorSeparator,
  BillCompanyInfo,
  BillCurrentAmount,
  BillCustomerAddress,
  BillCustomerCode,
  BillCustomerName,
  BillCustomerPhone,
  BillDateRange,
  BillFooter,
  BillHeader,
  BillNote,
  BillPreviousAmount,
  BillReferenceCode,
  BillTimestamp,
  BillTopDateTime,
  BillTotalAmountNumber,
  BillTotalAmountWords,
  BillTotalCollection,
} from "@/components/bill/BillBlocks";

// === LAYOUT MẶC ĐỊNH ===
export const DefaultInvoiceLayout = ({
  invoice,
  forwardedRef,
}: {
  invoice: InvoiceInfo | null;
  forwardedRef: ForwardedRef<ViewShot>;
}) => {
  // Style ẩn đi và chuẩn bị cho việc chụp ảnh (ViewShot)
  const hiddenViewShotStyle = {
    width: viewShotWidthInDp,
    backgroundColor: "#fff",
    position: "absolute" as const, // Phải có as const để ViewShot chấp nhận
    top: -9999,
    left: -9999,
    opacity: 0,
  };

  const billContainerStyle = {
    backgroundColor: "#FFFFFF",
    width: viewShotWidthInDp,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  };

  return (
    <ViewShot ref={forwardedRef} options={{ format: "png", quality: 1 }} style={hiddenViewShotStyle}>
      <View style={billContainerStyle}>
        <BillHeader label="BIÊN NHẬN THANH TOÁN" />
        <BillBillingPeriod invoice={invoice} label="Kỳ" />
        <BillCustomerCode invoice={invoice} label="Mã KH" />
        <BillCustomerName invoice={invoice} label="Tên KH" />
        <BillCustomerAddress invoice={invoice} label="Địa chỉ" />
        <BillCurrentAmount invoice={invoice} label="Kỳ này" />
        <BillPreviousAmount invoice={invoice} label="Kỳ trước" />
        <BillTotalAmountNumber invoice={invoice} label="Tổng tiền" />
        <BillTotalAmountWords invoice={invoice} label="Bằng chữ" />
        <BillCollectorSeparator label="*****" />
        <BillCollectorName invoice={invoice} label="Người thu" />
        <BillCollectorPhone invoice={invoice} label="SĐT" />
        <BillTimestamp label="Thời gian" />
        <BillFooter label="XIN CẢM ƠN QUÝ KHÁCH!" />
      </View>
    </ViewShot>
  );
};

// === LAYOUT ĐỘNG ===
export const DynamicInvoiceLayout = ({
  invoice,
  layout,
  forwardedRef,
  visible = false,
}: {
  invoice: InvoiceInfo | null;
  layout: InvoiceLayoutItem[];
  forwardedRef: ForwardedRef<ViewShot>;
  visible?: boolean;
}) => {
  const renderBillBlock = (block: InvoiceLayoutItem) => {
    if (!block.visible) return null;

    const BlockMap: Record<string, JSX.Element | null> = {
      header: <BillHeader label={block.label} />,
      billingPeriod: <BillBillingPeriod invoice={invoice} label={block.label} />,
      customerCode: <BillCustomerCode invoice={invoice} label={block.label} />,
      customerName: <BillCustomerName invoice={invoice} label={block.label} />,
      customerAddress: <BillCustomerAddress invoice={invoice} label={block.label} />,
      currentAmount: <BillCurrentAmount invoice={invoice} label={block.label} />,
      previousAmount: <BillPreviousAmount invoice={invoice} label={block.label} />,
      totalAmountNumber: <BillTotalAmountNumber invoice={invoice} label={block.label} />,
      collectionFee: <BillCollectionFee invoice={invoice} label={block.label} />,
      totalCollection: <BillTotalCollection invoice={invoice} label={block.label} />,
      totalAmountWords: <BillTotalAmountWords invoice={invoice} label={block.label} />,
      collectorSeparator: <BillCollectorSeparator label={block.label} />,
      collectorName: <BillCollectorName invoice={invoice} label={block.label} />,
      collectorPhone: <BillCollectorPhone invoice={invoice} label={block.label} />,
      topDateTime: <BillTopDateTime label={block.label} />,
      footer: <BillFooter label={block.label} />,
    };
    return BlockMap[block.id] || null;
  };

  // Quan trọng: Sử dụng visibility: hidden thay vì opacity: 0 để ViewShot có thể capture
  // opacity: 0 sẽ không được render bởi React Native ViewShot
  const dynamicViewShotStyle = {
    backgroundColor: "#fff",
    width: viewShotWidthInDp,
    minHeight: 200, // Đảm bảo có chiều cao tối thiểu
    ...(visible
      ? { opacity: 1, position: "relative" as const }
      : {
          position: "absolute" as const,
          top: 0,
          left: 0,
          // Sử dụng width/height cố định nhỏ thay vì 0 để đảm bảo render
          width: 1,
          height: 1,
          overflow: "hidden" as const,
        }),
  };

  const dynamicBillContainerStyle = {
    backgroundColor: "#FFFFFF",
    width: viewShotWidthInDp,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#ddd",
  };

  return (
    <ViewShot
      ref={forwardedRef}
      options={{ format: "png", quality: 1, snapshotContentContainer: true }}
      style={dynamicViewShotStyle}
    >
      <View style={dynamicBillContainerStyle} collapsable={false}>
        {layout.map((block) => (
          <React.Fragment key={block.id}>{renderBillBlock(block)}</React.Fragment>
        ))}
      </View>
    </ViewShot>
  );
};

export const DynamicNotiInvoiceLayout = ({
  invoice,
  layout,
  forwardedRef,
  visible = false,
}: {
  invoice: InvoiceInfo | null;
  layout: InvoiceLayoutItem[];
  forwardedRef: ForwardedRef<ViewShot>;
  visible?: boolean;
}) => {
  const renderBillBlock = (block: InvoiceLayoutItem) => {
    if (!block.visible) return null;

    const BlockMap: Record<string, JSX.Element | null> = {
      // --- Nhóm 1: Đầu trang ---
      topDateTime: <BillTopDateTime label={block.label} />,
      companyInfo: (
        <BillCompanyInfo
          name="ĐIỆN LỰC LẤP VÒ"
          address="Địa chỉ: QL80, Bình Thạnh 1, TT.Lấp Vò, H.Lấp Vò, Đồng Tháp"
          phoneservice="ĐT sửa chửa Dịch vụ về điện: 19001006 - 19009000"
        />
      ),
      header: <BillHeader label={block.label} customStyle={{ fontSize: 10 }} />,

      // --- Nhóm 2: Kỳ hóa đơn ---
      billingPeriod: <BillBillingPeriod invoice={invoice} label={block.label} customStyle={{ marginBottom: 0 }} />,
      dateRange: <BillDateRange invoice={invoice} />, // Mới

      // --- Nhóm 3: Khách hàng ---
      customerName: <BillCustomerName invoice={invoice} label={block.label} />,
      customerAddress: <BillCustomerAddress invoice={invoice} label={block.label} />,
      customerPhone: <BillCustomerPhone invoice={invoice} label={block.label} />, // Mới
      customerCode: <BillCustomerCode invoice={invoice} label={block.label} />,
      referenceCode: <BillReferenceCode invoice={invoice} label={block.label} />, // Mới (Mã Số)

      // totalAmountNumber & totalAmountWords giữ nguyên
      totalAmountNumber: <BillTotalAmountNumber invoice={invoice} label={block.label} />,
      totalAmountWords: <BillTotalAmountWords invoice={invoice} label={block.label} />,

      collectionFee: <BillCollectionFee invoice={invoice} label={block.label} />,
      totalCollection: <BillTotalCollection invoice={invoice} label={block.label} />,

      // --- Nhóm 6: Thu ngân & Cuối trang ---
      collectorSeparator: <BillCollectorSeparator label={block.label} />, // Dòng kẻ
      collectorName: <BillCollectorName invoice={invoice} label={block.label} />,
      collectorPhone: <BillCollectorPhone invoice={invoice} label={block.label} />,

      note: <BillNote label={block.label} />, // Nếu muốn thêm ghi chú
      footer: <BillFooter label={block.label} />,
    };
    return BlockMap[block.id] || null;
  };

  // Quan trọng: Sử dụng width/height cố định nhỏ thay vì opacity: 0 để ViewShot có thể capture
  const dynamicViewShotStyle = {
    backgroundColor: "#fff",
    width: viewShotWidthInDp,
    minHeight: 200, // Đảm bảo có chiều cao tối thiểu
    ...(visible
      ? { opacity: 1, position: "relative" as const }
      : {
          position: "absolute" as const,
          top: 0,
          left: 0,
          // Sử dụng width/height cố định nhỏ thay vì 0 để đảm bảo render
          width: 1,
          height: 1,
          overflow: "hidden" as const,
        }),
  };

  const dynamicBillContainerStyle = {
    backgroundColor: "#FFFFFF",
    width: viewShotWidthInDp,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#ddd",
  };

  return (
    <ViewShot
      ref={forwardedRef}
      options={{ format: "png", quality: 1, snapshotContentContainer: true }}
      style={dynamicViewShotStyle}
    >
      <View style={dynamicBillContainerStyle} collapsable={false}>
        {layout.map((block) => (
          <React.Fragment key={block.id}>{renderBillBlock(block)}</React.Fragment>
        ))}
      </View>
    </ViewShot>
  );
};

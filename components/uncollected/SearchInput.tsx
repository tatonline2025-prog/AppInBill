import { Text, TextInput } from "@/components/StyledText";
import { InvoiceInfo } from "@/types/invoice";
import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";



/* ==========================================================
 COMPONENT CON: Ô NHẬP & GỢI Ý
 ========================================================== */
const getInvoiceColor = (item: InvoiceInfo) => {
  if (item.isPaid) return "#9ca3af"; // xám nhạt đã đóng cước
  if (item.collectionStatus === "collected") return "#16a34a"; // xanh lá đã thu
  return "#000000"; // đen chưa thu
};

export default function SearchInput({
  customerCode,
  onChange,
  onSearch,
  suggestions,
  onSelect,
  searchType,
  onChangeSearchType,
  showPaidFilter,
  onTogglePaidFilter,
  isAdmin,
}: {
  customerCode: string;
  onChange: (text: string) => void;
  onSearch: () => void;
  suggestions: InvoiceInfo[];
  onSelect: (code: string) => void;
  searchType: string;
  onChangeSearchType: (type: string) => void;
  showPaidFilter?: boolean;
  onTogglePaidFilter?: (value: boolean) => void;
  isAdmin?: boolean;
}) {
  return (
    <View style={{ width: "100%", marginBottom: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            borderRadius: 14,
            paddingHorizontal: 10,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
            marginRight: 10,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: "#1e293b",
              paddingVertical: 10,
            }}
            placeholder={
              searchType === "customer"
                ? "Nhập mã khách hàng..."
                : searchType === "station"
                ? "Nhập mã trạm..."
                : "Nhập tên khách hàng..."
            }
            placeholderTextColor="#94a3b8"
            value={customerCode}
            onChangeText={onChange}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity
          onPress={() => onSearch()}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#2563eb",
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 12,
            shadowColor: "#2563eb",
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 3,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Tìm kiếm</Text>
        </TouchableOpacity>
      </View>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#f1f5f9",
          borderRadius: 10,
          marginBottom: 10,
          padding: 4,
          marginTop: 10,
        }}
      >
        {[
          { label: "Mã KH", value: "customer" },
          { label: "Mã Trạm", value: "station" },
          { label: "Tên KH", value: "customerName" },
        ].map((option) => {
          const isActive = searchType === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.8}
              onPress={() => onChangeSearchType(option.value)}
              style={{
                flex: 1,
                backgroundColor: isActive ? "#2563eb" : "transparent",
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: isActive ? "#2563eb" : "transparent",
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: isActive ? 2 : 0,
              }}
            >
              <Text
                style={{
                  color: isActive ? "#fff" : "#334155",
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {suggestions.length > 0 && (
        <View
          style={{
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            borderRadius: 12,
            marginTop: 10,
            maxHeight: 200,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <ScrollView
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((item, index) => {
              const color = getInvoiceColor(item);
              return (
                <TouchableOpacity
                  key={index}
                  style={{
                    position: 'relative',
                    paddingVertical: 12,
                    paddingLeft: 22,
                    paddingRight: 16,
                    borderBottomWidth: index !== suggestions.length - 1 ? 1 : 0,
                    borderColor: "#f1f5f9",
                  }}
                  onPress={() => {
                    if (searchType === "customer") {
                      onSelect(item.invoiceNumber);
                    } else if (searchType === "station") {
                      onSelect(item.recordBookCode!);
                    } else if (searchType === "customerName") {
                      onSelect(item.customerName);
                    }
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 6,
                      backgroundColor: color,
                      borderTopRightRadius: 3,
                      borderBottomRightRadius: 3,
                    }}
                  />
                  {searchType === "station" ? (
                    <Text style={{ fontWeight: "700", color, fontSize: 16 }}>{item.recordBookCode}</Text>
                  ) : (
                    <>
                      <Text style={{ fontWeight: "600", color, fontSize: 14 }}>
                        Mã Trạm: {item.recordBookCode}
                      </Text>
                      <Text style={{ fontWeight: "600", color: "#2563eb", fontSize: 15 }}>{item.invoiceNumber}</Text>
                      <Text style={{ color: "#475569", fontSize: 14 }}>{item.customerName}</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Checkbox lọc hóa đơn đã đóng cước - Bấm là hiển thị ngay
      <Pressable
        onPress={() => {
          onTogglePaidFilter?.(!showPaidFilter);
        }}
        hitSlop={20}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 12,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: showPaidFilter ? "#dbeafe" : "#f1f5f9",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: showPaidFilter ? "#2563eb" : "#e2e8f0",
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: showPaidFilter ? "#2563eb" : "#94a3b8",
            backgroundColor: showPaidFilter ? "#2563eb" : "transparent",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          {showPaidFilter && (
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>✓</Text>
          )}
        </View>
        <Text style={{ color: showPaidFilter ? "#2563eb" : "#475569", fontWeight: "600" }}>
          {"Xem hóa đơn đã đóng cước (tất cả)"}
        </Text>
      </Pressable> */}
    </View>
  );
}


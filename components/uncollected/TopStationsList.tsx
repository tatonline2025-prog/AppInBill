import { Text } from "@/components/StyledText";
import React from "react";
import { TouchableOpacity, View } from "react-native";

// Định nghĩa kiểu dữ liệu dựa trên kết quả trả về từ API của bạn
export type StationSummary = {
  stationName: string;
  totalAmount: number;
  count: number;
};

type TopStationsListProps = {
  title: string;
  stations: StationSummary[];
  onSelectStation?: (stationName: string) => void; // Hàm xử lý khi bấm vào trạm (nếu cần)
};

export default function TopStationsList({ title, stations, onSelectStation }: TopStationsListProps) {
  return (
    <View style={{ width: "100%", marginTop: 10 }}>
      <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 6 }}>{title}</Text>

      {stations.length === 0 ? (
        <Text style={{ color: "#64748b", fontStyle: "italic" }}>Chưa có dữ liệu thống kê.</Text>
      ) : (
        stations.map((item, index) => (
          <TouchableOpacity
            key={index}
            disabled={!onSelectStation} // Nếu không truyền hàm click thì không bấm được
            onPress={() => onSelectStation && onSelectStation(item.stationName)}
            style={{
              backgroundColor: "#fff",
              padding: 12,
              borderRadius: 8,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              flexDirection: "row", // Xếp ngang để hiển thị số thứ tự bên trái
              alignItems: "center",
            }}
          >
            {/* Cột thông tin chi tiết */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", color: "#1e293b", fontSize: 15 }}>
                  {item.stationName || "Không xác định"}
                </Text>
                <View style={{ backgroundColor: "#dbeafe", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 11, color: "#1e40af", fontWeight: "600" }}>{item.count} hoá đơn</Text>
                </View>
              </View>

              <Text style={{ color: "#0d9488", fontWeight: "600", marginTop: 4, fontSize: 15 }}>
                Tổng tiền: {item.totalAmount.toLocaleString("vi-VN")} VND
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

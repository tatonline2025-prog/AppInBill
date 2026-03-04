import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

const BASE_URL = Constants.expoConfig?.extra?.appBill;

export const updateCollectionFee = async (userId: string, fee: number) => {
  if (!BASE_URL) {
    throw new Error("BASE_URL chưa được cấu hình trong extra");
  }

  const token = await AsyncStorage.getItem("token");

  //   console.log(userId, fee, token);

  const res = await axios.put(
    `${BASE_URL}/api/user/${userId}/update-fee`,
    {
      collectionFee: fee,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`, // Gửi kèm token để xác thực
      },
    }
  );

  //   console.log(res);

  return res;
};

// Ví dụ: trong file src/types/user.ts
export interface IUser {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  role: "admin" | "user";
  province: string;
  collectionFee: string;
  createdAt: string; // Hoặc Date nếu bạn parse nó
  updatedAt: string; // Hoặc Date
}

export interface IUserResponse {
  message: string;
  token: string;
  user: IUser;
}

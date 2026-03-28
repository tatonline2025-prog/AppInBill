import "dotenv/config";

export default {
  expo: {
    owner: "minhtran01",
    name: "T.A.T In Bill",
    slug: "InBillApp",
    version: "1.2.9",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "inbillapp",
    userInterfaceStyle: "light",
    // Keep disabled for legacy native printer module compatibility
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.vodang.InBillApp",
      buildNumber: "2",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      versionCode: 39,
      minSdkVersion: 24,
      ndkVersion: "27.1.12297006",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.vodang.InBillApp",
      permissions: [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.INTERNET",
        "android.permission.ACCESS_WIFI_STATE",
        "android.permission.CHANGE_WIFI_STATE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.CAMERA",
        "android.permission.VIBRATE",
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-font",
        {
          fonts: [
            "./assets/fonts/Roboto-Regular.ttf",
            "./assets/fonts/Roboto-Bold.ttf",
            "./assets/fonts/NotoSans-Regular.ttf",
            "./assets/fonts/NotoSans-Bold.ttf",
            "./assets/fonts/NotoSans-Medium.ttf",
          ],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "81f667c4-1484-4c1c-bd8c-72c27dda1871",
      },
      //appBill: "https://hoadon.dvtienich.vn",
      appBill: "http://10.0.2.2:3000",
    },
    runtimeVersion: {
      policy: "appVersion",  
    },
    updates: {
      url: "https://u.expo.dev/81f667c4-1484-4c1c-bd8c-72c27dda1871",
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    }, 
  },
};

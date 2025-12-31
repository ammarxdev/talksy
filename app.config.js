import 'dotenv/config';

export default {
  expo: {
    name: "Talksy",
    slug: "VoiceAssistent",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "voiceassistent",
    linking: {
      prefixes: ["voiceassistent://"],
    },
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSMicrophoneUsageDescription: "This app uses the microphone for voice recognition and real-time audio level monitoring to provide a seamless voice assistant experience.",
        NSSpeechRecognitionUsageDescription: "This app uses speech recognition to convert your voice into text for the voice assistant functionality.",
        NSContactsUsageDescription: "This app accesses your contacts to help you make calls through voice commands.",
        NSUserTrackingUsageDescription: "This identifier will be used to deliver personalized ads to you and improve your app experience."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.bytebrewtechnologies.voiceassistent",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.READ_CONTACTS",
        "android.permission.CALL_PHONE",
        // AdMob permissions (automatically added by the plugin, but listed for clarity)
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "voiceassistent"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-build-properties",
        {
          android: {
            // ProGuard rules for UMP SDK (GDPR compliance)
            extraProguardRules: "-keep class com.google.android.gms.internal.consent_sdk.** { *; }"
          }
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/talksy-splash-logo.png",
          imageWidth: 300,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      [
        "expo-notifications",
        {
          // TODO: Create a 96x96 white PNG notification icon
          // icon: "./assets/images/notification-icon.png",
          color: "#667eea",
          defaultChannel: "default",
          sounds: [],
          enableBackgroundRemoteNotifications: false
        }
      ],
      [
        "expo-dev-client",
        {
          addGeneratedScheme: false
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you set a profile picture.",
          cameraPermission: "The app accesses your camera to let you take a profile picture.",
          microphonePermission: "The app accesses your microphone for video recording (if needed)."
        }
      ],
      [
        "expo-speech-recognition",
        {
          microphonePermission: "Allow $(PRODUCT_NAME) to use the microphone.",
          speechRecognitionPermission: "Allow $(PRODUCT_NAME) to use speech recognition.",
          androidSpeechServicePackages: [
            "com.google.android.googlequicksearchbox"
          ]
        }
      ],
      [
        "expo-contacts",
        {
          contactsPermission: "This app accesses your contacts to help you make calls through voice commands."
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          // Production App IDs
          androidAppId: "ca-app-pub-5419600451955416~1147631295",
          iosAppId: "ca-app-pub-3940256099942544~1458002511",
          // GDPR Compliance: Delay app measurement until consent is obtained
          delayAppMeasurementInit: true,
          // User tracking usage description for iOS App Tracking Transparency
          userTrackingUsageDescription: "This identifier will be used to deliver personalized ads to you and improve your app experience.",
          // SKAdNetwork identifiers for iOS conversion tracking
          skAdNetworkItems: [
            "cstr6suwn9.skadnetwork",
            "4fzdc2evr5.skadnetwork",
            "2fnua5tdw4.skadnetwork",
            "ydx93a7ass.skadnetwork",
            "p78axxw29g.skadnetwork",
            "v72qych5uu.skadnetwork",
            "ludvb6z3bs.skadnetwork",
            "cp8zw746q7.skadnetwork",
            "3sh42y64q3.skadnetwork",
            "c6k4g5qg8m.skadnetwork",
            "s39g8k73mm.skadnetwork",
            "3qy4746246.skadnetwork",
            "f38h382jlk.skadnetwork",
            "hs6bdukanm.skadnetwork",
            "mlmmfzh3r3.skadnetwork",
            "v4nxqhlyqp.skadnetwork",
            "wzmmz9fp6w.skadnetwork",
            "su67r6k2v3.skadnetwork",
            "yclnxrl5pm.skadnetwork",
            "t38b2kh725.skadnetwork",
            "7ug5zh24hu.skadnetwork",
            "gta9lk7p23.skadnetwork",
            "vutu7akeur.skadnetwork",
            "y5ghdn5j9k.skadnetwork",
            "v9wttpbfk9.skadnetwork",
            "n38lu8286q.skadnetwork",
            "47vhws6wlr.skadnetwork",
            "kbd757ywx3.skadnetwork",
            "9t245vhmpl.skadnetwork",
            "a2p9lx4jpn.skadnetwork",
            "22mmun2rn5.skadnetwork",
            "44jx6755aq.skadnetwork",
            "k674qkevps.skadnetwork",
            "4468km3ulz.skadnetwork",
            "2u9pt9hc89.skadnetwork",
            "8s468mfl3y.skadnetwork",
            "klf5c3l5u5.skadnetwork",
            "ppxm28t8ap.skadnetwork",
            "kbmxgpxpgc.skadnetwork",
            "uw77j35x4d.skadnetwork",
            "578prtvx9j.skadnetwork",
            "4dzt52r2t5.skadnetwork",
            "tl55sbb4fm.skadnetwork",
            "c3frkrj4fj.skadnetwork",
            "e5fvkxwrpn.skadnetwork",
            "8c4e2ghe7u.skadnetwork",
            "3rd42ekr43.skadnetwork",
            "97r2b46745.skadnetwork",
            "3qcr597p9d.skadnetwork"
          ]
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      eas: {
        projectId: "b6138f52-f6b1-4b67-99fc-011b3a54a28d"
      }
    }
  }
};

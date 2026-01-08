# 🎤 Voice Assistant App

A React Native voice-activated AI assistant app built with Expo that allows users to have natural conversations with AI through speech.

## ✨ Features

- **🔐 Authentication**: Complete email/password and Google OAuth authentication system
- **🎤 Voice-to-Text**: Convert speech to text using AssemblyAI
- **🤖 AI Conversations**: Generate intelligent responses using Gemini AI
- **🔊 Text-to-Speech**: Speak AI responses back to users using Expo Speech
- **🎨 3D Avatar**: Interactive 3D model with animations and visual feedback
- **🌙 Dark Mode**: Complete theme system with light/dark mode support
- **📱 Notifications**: Smart notification system with background support
- **📧 Contact System**: Built-in contact form with email integration
- **💾 Data Persistence**: Conversation history and user preferences
- **🛡️ Error Handling**: Comprehensive error handling and user feedback

## 🏗️ Architecture

```
User Speech → Expo Speech Recognition (STT) → Gemini AI → Expo Speech (TTS) → User Hears Response
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Gemini AI API Key (stored in Supabase; not in the app)
- Supabase Account (for authentication)
- Device with speech recognition support (Android 13+ or iOS 17+ recommended)

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure Environment Variables**

   Create a `.env` file in the root directory and add your API keys:
   ```env
   # AssemblyAI API Key (Get from: https://www.assemblyai.com/)
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here

   # OpenWeatherMap API Key (Get from: https://openweathermap.org/api)
   OPENWEATHER_API_KEY=your_openweather_api_key_here

   # Supabase Configuration (Get from: https://supabase.com/)
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

3. **Configure Gemini via Supabase (recommended)**

   This app calls a Supabase Edge Function (`gemini-proxy`) which fetches the Gemini API key + model from a Supabase table at request time.

   Setup guide: docs/GEMINI_SUPABASE_MANAGED_CONFIG.md

4. **Start the app**

   ```bash
   npx expo start
   ```

4. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## 📱 Usage

### Authentication
1. **Sign Up**: Create account with email/password or use Google OAuth
2. **Email Verification**: Check email and verify account (for email signup)
3. **Sign In**: Access the app with your credentials

### Voice Assistant
1. **Grant Permissions**: Allow microphone access when prompted
2. **Start Conversation**: Tap the 3D avatar to start recording
3. **Speak**: Say your question or message clearly
4. **Stop Recording**: Tap the avatar again to stop recording
5. **Listen**: Wait for the AI response to be spoken back
6. **Continue**: The app returns to idle state, ready for the next conversation

### Voice Assistant States

- **Idle** 🔵: Ready to start conversation
- **Listening** 🔴: Recording your voice
- **Processing** 🟡: Converting speech to text
- **Thinking** 🟢: Generating AI response
- **Speaking** 🟣: Playing AI response

### Profile & Settings
- **Theme**: Switch between light/dark mode or use system preference
- **Notifications**: Configure notification preferences
- **Contact**: Send feedback or report issues
- **Help**: Access FAQ and support information

## 🛠️ Development

### Project Structure

```
├── app/                       # Main app screens using Expo Router
│   ├── (tabs)/                # Tab-based navigation
│   │   ├── index.tsx          # Voice assistant screen
│   │   ├── profile.tsx        # User profile & settings
│   │   └── _layout.tsx        # Tab navigation layout
│   ├── auth.tsx               # Authentication screen
│   ├── contact-us.tsx         # Contact form screen
│   ├── help-faq.tsx           # Help & FAQ screen
│   └── _layout.tsx            # Root layout with providers
├── components/                # Reusable UI components
│   ├── ui/                    # UI primitives
│   │   ├── IconSymbol.tsx     # Cross-platform icons
│   │   └── TabBarBackground.tsx # Tab bar styling
│   ├── AuthGuard.tsx          # Route protection
│   ├── CustomAlert.tsx        # Alert system
│   ├── ModelViewer.tsx        # 3D avatar component
│   ├── ProgressIndicator.tsx  # Loading indicators
│   ├── ThemedText.tsx         # Themed text components
│   ├── ThemedView.tsx         # Themed view components
│   ├── Toast.tsx              # Toast notifications
│   └── WaveformAnimation.tsx  # Voice visualization
├── config/                    # Configuration files
│   ├── api.ts                 # API configuration
│   ├── contact.ts             # Contact system config
│   └── supabase.ts            # Supabase client setup
├── contexts/                  # React Context providers
│   ├── AlertContext.tsx       # Alert system context
│   ├── AuthContext.tsx        # Authentication context
│   ├── NotificationContext.tsx # Notification context
│   └── ThemeContext.tsx       # Theme system context
├── hooks/                     # Custom React hooks
│   ├── useAlert.ts            # Alert system hook
│   ├── useAuth.ts             # Authentication hook
│   ├── useNotifications.ts    # Notifications hook
│   ├── useTheme.ts            # Theme system hook
│   ├── useNativeSpeechRecognition.ts # Native speech recognition hook
│   └── useVoiceAssistantFlowNative.ts # Voice assistant hook (native)
├── services/                  # API and service integrations
│   ├── AIResponseService.ts   # Gemini AI integration
│   ├── ContactService.ts      # Contact form handling
│   ├── NotificationService.ts # Notification management
│   ├── ExpoSpeechToTextService.ts # Native speech recognition service
│   ├── TextToSpeechService.ts # Text-to-speech service
│   ├── WeatherService.ts      # Weather data integration
│   └── LocationService.ts     # Location services
├── utils/                     # Utility functions
│   ├── performance.ts         # Performance monitoring
│   ├── settingsStorage.ts     # Settings persistence
│   └── themeStorage.ts        # Theme persistence
└── assets/                    # Static assets
    ├── images/                # App images
    └── models/                # 3D models
```

## 🏗️ Tech Stack

- **Frontend**: React Native with Expo SDK 53
- **Navigation**: Expo Router with tab-based navigation
- **Authentication**: Supabase with email/password and Google OAuth
- **AI Services**: Google Gemini AI for responses, AssemblyAI for speech-to-text
- **3D Graphics**: Three.js with React Three Fiber for 3D avatar
- **State Management**: React Context for global state
- **Styling**: React Native StyleSheet with theme system
- **Notifications**: Expo Notifications with background support
- **Storage**: AsyncStorage for data persistence

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Errors**: Check Supabase configuration and environment variables
2. **Microphone Permission Denied**: Enable in device settings
3. **API Key Errors**: Verify all API keys in `.env` file
4. **Network Errors**: Check internet connection and API endpoints
5. **Audio Issues**: Test microphone with other apps
6. **3D Model Loading**: Ensure model files are properly bundled
7. **Notification Issues**: Check device notification permissions

### Getting Help

- Check the **Help & FAQ** section in the app
- Use the **Contact Us** feature to report issues
- Review the documentation in the `docs/` folder

## 📄 License

This project is licensed under the MIT License.

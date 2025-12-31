# AdMob Testing Guide for Talksy

This guide will help you create a development build and test all AdMob functionality in your Talksy voice assistant app.

## 🚀 Creating Development Build

### Prerequisites
- Expo CLI installed: `npm install -g @expo/cli`
- EAS CLI installed: `npm install -g eas-cli`
- Expo account and EAS Build configured

### Step 1: Configure for Development Build

1. **Install Expo Dev Client**:
   ```bash
   npx expo install expo-dev-client
   ```

2. **Update app.config.js** (already done):
   - AdMob plugin is configured with test App IDs
   - All required permissions are set

### Step 2: Create Development Build

#### For Android:
```bash
# Create development build for Android
eas build --profile development --platform android

# Or create local build (if you have Android Studio)
npx expo run:android
```

#### For iOS:
```bash
# Create development build for iOS
eas build --profile development --platform ios

# Or create local build (if you have Xcode)
npx expo run:ios
```

### Step 3: Install Development Build
1. Download the build from EAS Build dashboard
2. Install on your physical device (AdMob doesn't work in simulators)
3. Launch the app

## 🧪 Testing Checklist

### Phase 1: Basic AdMob Setup
- [ ] App launches without crashes
- [ ] AdMob SDK initializes successfully
- [ ] No console errors related to AdMob
- [ ] Test ad IDs are working

### Phase 2: Banner Ad Testing
- [ ] **Voice Assistant Banner**:
  - [ ] Loads at bottom of voice assistant screen
  - [ ] Fades out during voice interactions
  - [ ] Positioned correctly above tab bar
  - [ ] Doesn't interfere with voice functionality
  
- [ ] **Profile Banner Ads**:
  - [ ] Header banner loads after profile info
  - [ ] Middle banner loads between sections
  - [ ] Bottom banner loads before footer
  - [ ] All banners have proper spacing and styling

- [ ] **Banner Error Handling**:
  - [ ] Shows loading indicator while loading
  - [ ] Shows retry button on failure
  - [ ] Graceful fallback when ads fail

### Phase 3: Interstitial Ad Testing
- [ ] **Voice Assistant Interstitials**:
  - [ ] Shows after voice sessions end (>10 seconds)
  - [ ] Never interrupts active voice sessions
  - [ ] Respects frequency limits (1 per minute)
  - [ ] Has appropriate delay (2 seconds)

- [ ] **Navigation Interstitials**:
  - [ ] Shows after 4 tab switches
  - [ ] Has 1.5-minute cooldown between ads
  - [ ] Doesn't show during voice sessions
  - [ ] Smooth transition with 1.5-second delay

- [ ] **App State Interstitials**:
  - [ ] Shows when returning from background (45+ seconds)
  - [ ] Maximum 2 ads per app session
  - [ ] 4-minute cooldown between app state ads
  - [ ] 2-second delay after app becomes active

### Phase 4: Frequency Management
- [ ] **Global Frequency**:
  - [ ] Tracks user interactions correctly
  - [ ] Respects minimum intervals between ads
  - [ ] Session limits work properly
  - [ ] Data persists between app sessions

- [ ] **Voice Session Tracking**:
  - [ ] Tracks session start/end correctly
  - [ ] Records interactions during sessions
  - [ ] Calculates session statistics accurately
  - [ ] Influences ad timing decisions

- [ ] **Profile Interaction Tracking**:
  - [ ] Records profile interactions
  - [ ] Tracks ad display timing
  - [ ] Influences middle banner visibility

### Phase 5: Smart Timing Logic
- [ ] **Context-Aware Decisions**:
  - [ ] Different logic for voice assistant vs profile
  - [ ] Confidence scoring works correctly
  - [ ] Suggested delays are applied
  - [ ] Reasons are logged clearly

- [ ] **User Behavior Analysis**:
  - [ ] Adapts to short vs long voice sessions
  - [ ] Adjusts frequency for heavy users
  - [ ] Respects user engagement patterns

## 🔧 Testing Tools

### AdMob Test Suite
Access the comprehensive test suite by adding this to any screen:

```typescript
import { AdMobTestSuite } from '@/components/ads/AdMobTestSuite';

// Add to your component
<AdMobTestSuite />
```

### Console Logging
Monitor these console logs during testing:
- `🚀 Initializing AdMob SDK...`
- `✅ AdMob SDK initialized successfully`
- `🔄 Loading interstitial ad...`
- `✅ Interstitial ad loaded successfully`
- `🎬 Showing interstitial ad: [reason]`
- `⏭️ Skipping interstitial ad: [reason]`

### Debug Commands
Use these in the test suite:
- **Reset All Data**: Clears all frequency tracking
- **Simulate Voice Session**: Tests voice session tracking
- **Force Navigation Ad**: Tests navigation ad logic
- **Test App State Ad**: Tests background/foreground ads

## 🐛 Common Issues & Solutions

### Issue: Ads Not Loading
**Symptoms**: Banner ads show loading forever, interstitials never load
**Solutions**:
1. Check internet connection
2. Verify test ad unit IDs are correct
3. Ensure app is running on physical device
4. Check console for initialization errors

### Issue: Interstitials Not Showing
**Symptoms**: `canShowAd` returns false, ads are loaded but not displayed
**Solutions**:
1. Check frequency limits in console logs
2. Verify voice sessions aren't active
3. Reset frequency data using test suite
4. Check timing logic confidence scores

### Issue: Banner Ads Interfering with UI
**Symptoms**: Banners overlap content, voice assistant issues
**Solutions**:
1. Check safe area calculations
2. Verify banner positioning styles
3. Test on different screen sizes
4. Adjust margin/padding values

### Issue: App Crashes on Ad Events
**Symptoms**: App crashes when ads load/show/close
**Solutions**:
1. Check error handling in ad event listeners
2. Verify all required permissions are granted
3. Update to latest react-native-google-mobile-ads version
4. Check for memory leaks in ad components

## 📊 Performance Monitoring

### Key Metrics to Track
- **Ad Load Success Rate**: Should be >80%
- **Ad Display Success Rate**: Should be >90%
- **App Crash Rate**: Should be <1%
- **Voice Assistant Performance**: No degradation
- **User Engagement**: Monitor session lengths

### Analytics Events
Monitor these events in your analytics:
- `ad_loaded` - Ad successfully loaded
- `ad_failed_to_load` - Ad failed to load
- `ad_impression` - Ad was displayed
- `ad_clicked` - User clicked on ad
- `ad_closed` - User closed ad

## 🚀 Production Preparation

### Before Publishing
1. **Replace Test IDs**: Update `config/admob.ts` with real ad unit IDs
2. **Test Real Ads**: Test with actual ads (limited clicks)
3. **Performance Testing**: Ensure no performance degradation
4. **User Testing**: Get feedback from beta users
5. **Analytics Setup**: Ensure all events are tracked
6. **Privacy Compliance**: Implement GDPR/CCPA consent

### App Store Requirements
- **Android**: Add "Contains Ads" declaration in Play Console
- **iOS**: Add appropriate app privacy labels
- **Both**: Include ad disclosure in app description

## 📞 Support

If you encounter issues:
1. Check console logs for detailed error messages
2. Use the AdMob Test Suite for debugging
3. Refer to [react-native-google-mobile-ads documentation](https://docs.page/invertase/react-native-google-mobile-ads)
4. Check [Google AdMob documentation](https://developers.google.com/admob)

Remember: AdMob ads only work on physical devices with development builds, not in Expo Go or simulators!

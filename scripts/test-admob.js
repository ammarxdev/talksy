#!/usr/bin/env node

/**
 * AdMob Testing Script
 * Comprehensive testing utilities for AdMob functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkAdMobFiles() {
  log('\n🔍 Checking AdMob implementation files...', 'cyan');
  
  const requiredFiles = [
    'config/admob.ts',
    'services/AdMobService.ts',
    'services/InterstitialAdService.ts',
    'hooks/useAdMob.ts',
    'hooks/useInterstitialAd.ts',
    'components/ads/BannerAd.tsx',
    'components/ads/VoiceAssistantBanner.tsx',
    'components/ads/ProfileBanner.tsx',
    'utils/adFrequencyManager.ts',
    'utils/voiceSessionTracker.ts',
    'utils/profileAdManager.ts',
    'utils/appStateInterstitialManager.ts',
  ];

  let allFilesExist = true;

  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} - MISSING`, 'red');
      allFilesExist = false;
    }
  });

  if (allFilesExist) {
    log('\n✅ All AdMob files are present', 'green');
  } else {
    log('\n❌ Some AdMob files are missing', 'red');
    return false;
  }

  return true;
}

function checkConfiguration() {
  log('\n🔧 Checking AdMob configuration...', 'cyan');
  
  // Check app.config.js
  const appConfigPath = path.join(process.cwd(), 'app.config.js');
  if (fs.existsSync(appConfigPath)) {
    const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
    
    if (appConfigContent.includes('react-native-google-mobile-ads')) {
      log('✅ AdMob plugin configured in app.config.js', 'green');
    } else {
      log('❌ AdMob plugin not found in app.config.js', 'red');
      return false;
    }

    if (appConfigContent.includes('ca-app-pub-3940256099942544')) {
      log('✅ Test App IDs configured', 'green');
    } else {
      log('⚠️  Test App IDs not found', 'yellow');
    }

    if (appConfigContent.includes('NSUserTrackingUsageDescription')) {
      log('✅ iOS App Tracking Transparency configured', 'green');
    } else {
      log('❌ iOS App Tracking Transparency not configured', 'red');
      return false;
    }
  } else {
    log('❌ app.config.js not found', 'red');
    return false;
  }

  // Check package.json for required dependencies
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredPackages = [
      'react-native-google-mobile-ads',
      'expo-dev-client',
      '@react-native-async-storage/async-storage',
    ];

    requiredPackages.forEach(pkg => {
      if (dependencies[pkg]) {
        log(`✅ ${pkg} v${dependencies[pkg]}`, 'green');
      } else {
        log(`❌ ${pkg} - MISSING`, 'red');
      }
    });
  }

  return true;
}

function runTypeScriptCheck() {
  log('\n📝 Running TypeScript check...', 'cyan');
  
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    log('✅ TypeScript check passed', 'green');
    return true;
  } catch (error) {
    log('❌ TypeScript errors found:', 'red');
    console.log(error.stdout?.toString() || error.message);
    return false;
  }
}

function showBuildInstructions() {
  log('\n🚀 Development Build Instructions:', 'cyan');
  log('', 'reset');
  log('1. Create Development Build:', 'bright');
  log('   npm run build:android  # For Android', 'reset');
  log('   npm run build:ios      # For iOS', 'reset');
  log('   npm run build:all      # For both platforms', 'reset');
  log('', 'reset');
  log('2. Alternative - Local Build (requires Android Studio/Xcode):', 'bright');
  log('   npx expo run:android   # Local Android build', 'reset');
  log('   npx expo run:ios       # Local iOS build', 'reset');
  log('', 'reset');
  log('3. Install on Physical Device:', 'bright');
  log('   - Download from EAS Build dashboard', 'reset');
  log('   - Install APK/IPA on your device', 'reset');
  log('   - AdMob only works on physical devices!', 'yellow');
  log('', 'reset');
  log('4. Testing:', 'bright');
  log('   - Launch app and check console logs', 'reset');
  log('   - Look for "✅ AdMob SDK initialized successfully"', 'green');
  log('   - Test banner ads on Voice Assistant and Profile screens', 'reset');
  log('   - Test interstitial ads by using voice assistant multiple times', 'reset');
  log('   - Use the AdMob Test Suite for comprehensive testing', 'reset');
  log('', 'reset');
}

function showTestingChecklist() {
  log('\n📋 AdMob Testing Checklist:', 'cyan');
  log('', 'reset');
  log('□ App launches without crashes', 'reset');
  log('□ AdMob SDK initializes (check console)', 'reset');
  log('□ Banner ads load on Voice Assistant screen', 'reset');
  log('□ Banner ads load on Profile screen (3 locations)', 'reset');
  log('□ Voice Assistant banner fades during voice interactions', 'reset');
  log('□ Interstitial ads show after voice sessions', 'reset');
  log('□ Interstitial ads show after tab navigation (4+ switches)', 'reset');
  log('□ Interstitial ads show when returning from background', 'reset');
  log('□ Frequency limits work (no ad spam)', 'reset');
  log('□ Error handling works (retry buttons, graceful fallbacks)', 'reset');
  log('□ Voice functionality not affected by ads', 'reset');
  log('□ App performance remains good', 'reset');
  log('', 'reset');
  log('💡 Pro Tips:', 'bright');
  log('- Use the AdMob Test Suite component for debugging', 'reset');
  log('- Monitor console logs for detailed ad events', 'reset');
  log('- Test on different screen sizes and orientations', 'reset');
  log('- Test with poor network conditions', 'reset');
  log('- Click test ads safely (they won\'t affect your AdMob account)', 'reset');
  log('', 'reset');
}

function showTroubleshooting() {
  log('\n🔧 Common Issues & Solutions:', 'cyan');
  log('', 'reset');
  log('❌ "Ads not loading":', 'red');
  log('   - Ensure you\'re on a physical device', 'reset');
  log('   - Check internet connection', 'reset');
  log('   - Verify test ad unit IDs in config/admob.ts', 'reset');
  log('   - Check console for initialization errors', 'reset');
  log('', 'reset');
  log('❌ "App crashes on ad events":', 'red');
  log('   - Update react-native-google-mobile-ads to latest version', 'reset');
  log('   - Check error handling in ad components', 'reset');
  log('   - Verify all permissions are granted', 'reset');
  log('', 'reset');
  log('❌ "Interstitials not showing":', 'red');
  log('   - Check frequency limits in console logs', 'reset');
  log('   - Verify voice sessions aren\'t active', 'reset');
  log('   - Use AdMob Test Suite to reset frequency data', 'reset');
  log('', 'reset');
  log('❌ "Banner ads interfering with UI":', 'red');
  log('   - Check safe area calculations', 'reset');
  log('   - Verify banner positioning styles', 'reset');
  log('   - Test on different screen sizes', 'reset');
  log('', 'reset');
}

async function main() {
  log('🎯 Talksy AdMob Testing Helper', 'magenta');
  log('==============================', 'magenta');

  // Run all checks
  const filesOk = checkAdMobFiles();
  const configOk = checkConfiguration();
  const typesOk = runTypeScriptCheck();

  if (filesOk && configOk && typesOk) {
    log('\n🎉 All checks passed! Ready for development build.', 'green');
  } else {
    log('\n⚠️  Some issues found. Please fix them before building.', 'yellow');
  }

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function askQuestion(question) {
    return new Promise((resolve) => {
      readline.question(question, resolve);
    });
  }

  while (true) {
    log('\n📋 What would you like to do?', 'cyan');
    log('1. Show build instructions', 'bright');
    log('2. Show testing checklist', 'bright');
    log('3. Show troubleshooting guide', 'bright');
    log('4. Run development build (Android)', 'bright');
    log('5. Run development build (iOS)', 'bright');
    log('6. Exit', 'bright');

    const choice = await askQuestion('\nSelect an option (1-6): ');

    switch (choice.trim()) {
      case '1':
        showBuildInstructions();
        break;

      case '2':
        showTestingChecklist();
        break;

      case '3':
        showTroubleshooting();
        break;

      case '4':
        log('\n🚀 Starting Android development build...', 'yellow');
        try {
          execSync('eas build --profile development --platform android', { stdio: 'inherit' });
          log('\n✅ Android build completed!', 'green');
        } catch (error) {
          log('\n❌ Android build failed', 'red');
        }
        break;

      case '5':
        log('\n🚀 Starting iOS development build...', 'yellow');
        try {
          execSync('eas build --profile development --platform ios', { stdio: 'inherit' });
          log('\n✅ iOS build completed!', 'green');
        } catch (error) {
          log('\n❌ iOS build failed', 'red');
        }
        break;

      case '6':
        log('\n👋 Happy testing!', 'green');
        readline.close();
        process.exit(0);

      default:
        log('\n❌ Invalid option. Please select 1-6.', 'red');
    }

    await askQuestion('\nPress Enter to continue...');
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n👋 Testing helper cancelled.', 'yellow');
  process.exit(0);
});

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});

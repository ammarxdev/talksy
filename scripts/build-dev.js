#!/usr/bin/env node

/**
 * Development Build Script for AdMob Testing
 * Helps create development builds with proper AdMob configuration
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

function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'cyan');
  
  try {
    // Check if Expo CLI is installed
    execSync('expo --version', { stdio: 'ignore' });
    log('✅ Expo CLI is installed', 'green');
  } catch (error) {
    log('❌ Expo CLI not found. Install with: npm install -g @expo/cli', 'red');
    process.exit(1);
  }

  try {
    // Check if EAS CLI is installed
    execSync('eas --version', { stdio: 'ignore' });
    log('✅ EAS CLI is installed', 'green');
  } catch (error) {
    log('❌ EAS CLI not found. Install with: npm install -g eas-cli', 'red');
    process.exit(1);
  }

  // Check if expo-dev-client is installed
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies['expo-dev-client']) {
      log('✅ expo-dev-client is installed', 'green');
    } else {
      log('⚠️  expo-dev-client not found. Installing...', 'yellow');
      try {
        execSync('npx expo install expo-dev-client', { stdio: 'inherit' });
        log('✅ expo-dev-client installed successfully', 'green');
      } catch (error) {
        log('❌ Failed to install expo-dev-client', 'red');
        process.exit(1);
      }
    }

    if (dependencies['react-native-google-mobile-ads']) {
      log('✅ react-native-google-mobile-ads is installed', 'green');
    } else {
      log('❌ react-native-google-mobile-ads not found', 'red');
      process.exit(1);
    }
  }
}

function checkAdMobConfiguration() {
  log('\n🔧 Checking AdMob configuration...', 'cyan');
  
  // Check app.config.js
  const appConfigPath = path.join(process.cwd(), 'app.config.js');
  if (fs.existsSync(appConfigPath)) {
    const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
    
    if (appConfigContent.includes('react-native-google-mobile-ads')) {
      log('✅ AdMob plugin configured in app.config.js', 'green');
    } else {
      log('❌ AdMob plugin not found in app.config.js', 'red');
      process.exit(1);
    }

    if (appConfigContent.includes('ca-app-pub-3940256099942544')) {
      log('✅ Test App IDs configured', 'green');
    } else {
      log('⚠️  Test App IDs not found - make sure you\'re using test IDs for development', 'yellow');
    }
  } else {
    log('❌ app.config.js not found', 'red');
    process.exit(1);
  }

  // Check AdMob config file
  const admobConfigPath = path.join(process.cwd(), 'config', 'admob.ts');
  if (fs.existsSync(admobConfigPath)) {
    log('✅ AdMob configuration file exists', 'green');
  } else {
    log('❌ AdMob configuration file not found at config/admob.ts', 'red');
    process.exit(1);
  }
}

function showBuildOptions() {
  log('\n🚀 Build Options:', 'cyan');
  log('1. Android Development Build (EAS)', 'bright');
  log('2. iOS Development Build (EAS)', 'bright');
  log('3. Android Local Build', 'bright');
  log('4. iOS Local Build', 'bright');
  log('5. Both Platforms (EAS)', 'bright');
  log('6. Show Testing Guide', 'bright');
  log('7. Exit', 'bright');
}

function executeCommand(command, description) {
  log(`\n${description}...`, 'yellow');
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed successfully`, 'green');
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    process.exit(1);
  }
}

function showTestingGuide() {
  log('\n📚 AdMob Testing Guide:', 'cyan');
  log('', 'reset');
  log('1. Install the development build on a PHYSICAL DEVICE', 'bright');
  log('   (AdMob doesn\'t work in simulators or Expo Go)', 'reset');
  log('', 'reset');
  log('2. Launch the app and check console logs for:', 'bright');
  log('   - "✅ AdMob SDK initialized successfully"', 'green');
  log('   - "✅ Banner ad loaded successfully"', 'green');
  log('   - "✅ Interstitial ad loaded successfully"', 'green');
  log('', 'reset');
  log('3. Test banner ads:', 'bright');
  log('   - Voice Assistant screen (bottom banner)', 'reset');
  log('   - Profile screen (header, middle, bottom banners)', 'reset');
  log('', 'reset');
  log('4. Test interstitial ads:', 'bright');
  log('   - Use voice assistant multiple times', 'reset');
  log('   - Switch between tabs 4+ times', 'reset');
  log('   - Put app in background for 45+ seconds', 'reset');
  log('', 'reset');
  log('5. Use the AdMob Test Suite for debugging:', 'bright');
  log('   - Add <AdMobTestSuite /> to any screen', 'reset');
  log('   - Monitor real-time ad status', 'reset');
  log('   - Test individual ad components', 'reset');
  log('', 'reset');
  log('6. Check the full testing guide:', 'bright');
  log('   - docs/ADMOB_TESTING_GUIDE.md', 'cyan');
  log('', 'reset');
}

async function main() {
  log('🎯 Talksy AdMob Development Build Helper', 'magenta');
  log('==========================================', 'magenta');

  checkPrerequisites();
  checkAdMobConfiguration();

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
    showBuildOptions();
    const choice = await askQuestion('\nSelect an option (1-7): ');

    switch (choice.trim()) {
      case '1':
        executeCommand(
          'eas build --profile development --platform android',
          'Building Android development build'
        );
        log('\n📱 Once build completes:', 'cyan');
        log('1. Download APK from EAS Build dashboard', 'reset');
        log('2. Install on Android device', 'reset');
        log('3. Launch app and test AdMob functionality', 'reset');
        break;

      case '2':
        executeCommand(
          'eas build --profile development --platform ios',
          'Building iOS development build'
        );
        log('\n📱 Once build completes:', 'cyan');
        log('1. Download IPA from EAS Build dashboard', 'reset');
        log('2. Install on iOS device (requires Apple Developer account)', 'reset');
        log('3. Launch app and test AdMob functionality', 'reset');
        break;

      case '3':
        log('\n⚠️  Make sure you have Android Studio installed', 'yellow');
        const continueAndroid = await askQuestion('Continue with local Android build? (y/n): ');
        if (continueAndroid.toLowerCase() === 'y') {
          executeCommand('npx expo run:android', 'Building Android locally');
        }
        break;

      case '4':
        log('\n⚠️  Make sure you have Xcode installed', 'yellow');
        const continueiOS = await askQuestion('Continue with local iOS build? (y/n): ');
        if (continueiOS.toLowerCase() === 'y') {
          executeCommand('npx expo run:ios', 'Building iOS locally');
        }
        break;

      case '5':
        executeCommand(
          'eas build --profile development --platform all',
          'Building for both platforms'
        );
        break;

      case '6':
        showTestingGuide();
        await askQuestion('\nPress Enter to continue...');
        break;

      case '7':
        log('\n👋 Happy testing!', 'green');
        readline.close();
        process.exit(0);

      default:
        log('\n❌ Invalid option. Please select 1-7.', 'red');
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n👋 Build process cancelled.', 'yellow');
  process.exit(0);
});

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});

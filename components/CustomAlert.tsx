import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'voice';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title?: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onDismiss?: () => void;
  dismissible?: boolean;
}

const { width, height } = Dimensions.get('window');

export default function CustomAlert({
  visible,
  title,
  message,
  type = 'info',
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
  dismissible = true,
}: CustomAlertProps) {
  const { colors, colorScheme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getAlertColors = () => {
    const isDark = colorScheme === 'dark';
    const baseColors = {
      background: colors.cardBackground,
      text: colors.textPrimary,
      secondaryText: colors.textSecondary,
      border: colors.border,
      buttonBackground: colors.surfaceVariant,
      buttonBorder: colors.border,
      buttonText: colors.textPrimary,
      buttonTextSecondary: colors.textSecondary,
    };

    switch (type) {
      case 'success':
        return {
          ...baseColors,
          accent: '#30D158',
          iconBackground: isDark ? '#30D15825' : '#30D15820',
        };
      case 'error':
        return {
          ...baseColors,
          accent: '#FF453A',
          iconBackground: isDark ? '#FF453A25' : '#FF453A20',
        };
      case 'warning':
        return {
          ...baseColors,
          accent: '#FF9F0A',
          iconBackground: isDark ? '#FF9F0A25' : '#FF9F0A20',
        };
      case 'voice':
        return {
          ...baseColors,
          accent: '#8B5CF6',
          iconBackground: isDark ? '#8B5CF625' : '#8B5CF620',
        };
      case 'info':
      default:
        return {
          ...baseColors,
          accent: '#007AFF',
          iconBackground: isDark ? '#007AFF25' : '#007AFF20',
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'voice':
        return '🎤';
      case 'info':
      default:
        return 'i';
    }
  };

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleBackdropPress = () => {
    if (dismissible && onDismiss) {
      onDismiss();
    }
  };

  const alertColors = getAlertColors();

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: opacityAnim },
            ]}
          />
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.alertContainer,
                {
                  backgroundColor: alertColors.background,
                  borderColor: alertColors.border,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: alertColors.iconBackground,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.icon,
                    { color: alertColors.accent },
                  ]}
                >
                  {getIcon()}
                </ThemedText>
              </View>

              {/* Content */}
              <View style={styles.content}>
                {title && (
                  <ThemedText
                    style={[
                      styles.title,
                      { color: alertColors.text },
                    ]}
                  >
                    {title}
                  </ThemedText>
                )}
                <ThemedText
                  style={[
                    styles.message,
                    { color: alertColors.text },
                    !title && styles.messageNoTitle,
                  ]}
                >
                  {message}
                </ThemedText>
              </View>

              {/* Buttons */}
              <View style={[
                styles.buttonContainer,
                buttons.length > 2 ? styles.buttonContainerVertical : styles.buttonContainerHorizontal
              ]}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      buttons.length > 2 ? styles.buttonVertical : styles.buttonHorizontal,
                      button.style === 'cancel' && styles.cancelButton,
                      button.style === 'destructive' && styles.destructiveButton,
                      buttons.length <= 2 && index === 0 && buttons.length > 1 && styles.firstButtonHorizontal,
                      buttons.length > 2 && index < buttons.length - 1 && styles.buttonVerticalBorder,
                      {
                        borderColor: alertColors.buttonBorder,
                        backgroundColor: button.style === 'cancel' ? 'transparent' : alertColors.buttonBackground,
                      },
                    ]}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={[
                        styles.buttonText,
                        { color: alertColors.buttonText },
                        button.style === 'cancel' && { color: alertColors.buttonTextSecondary },
                        button.style === 'destructive' && styles.destructiveButtonText,
                        button.style === 'default' && { color: alertColors.accent },
                      ]}
                    >
                      {button.text}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  alertContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 0.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    minHeight: 80,
  },
  icon: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    justifyContent: 'center',
    minHeight: 80,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.85,
    letterSpacing: 0.1,
  },
  messageNoTitle: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 1,
    letterSpacing: 0.2,
  },
  buttonContainer: {
    borderTopWidth: 1,
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonHorizontal: {
    flex: 1,
  },
  buttonVertical: {
    width: '100%',
  },
  firstButtonHorizontal: {
    borderRightWidth: 1,
  },
  buttonVerticalBorder: {
    borderBottomWidth: 1,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  cancelButton: {
    // No additional styling needed
  },
  destructiveButton: {
    // No additional styling needed
  },
  destructiveButtonText: {
    color: '#FF453A',
    fontWeight: '700',
  },
});

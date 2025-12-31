import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '@/hooks/useTheme';
import { PermissionType, PermissionInfo, permissionManager } from '@/services/PermissionManager';

export interface PermissionRequestProps {
  visible: boolean;
  permissionType: PermissionType;
  onAllow: () => void;
  onDeny: () => void;
  onOpenSettings: () => void;
  canAskAgain: boolean;
  dismissible?: boolean;
}

const { width, height } = Dimensions.get('window');

export default function PermissionRequestModal({
  visible,
  permissionType,
  onAllow,
  onDeny,
  onOpenSettings,
  canAskAgain,
  dismissible = true,
}: PermissionRequestProps) {
  const { colors, colorScheme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const permissionInfo: PermissionInfo = permissionManager.getPermissionInfo(permissionType);

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacityAnim, scaleAnim]);

  const handleBackdropPress = () => {
    if (dismissible) {
      onDeny();
    }
  };

  const getIconColor = () => {
    if (permissionInfo.required) {
      return colors.error;
    }
    return colors.primary;
  };

  const getIconBackgroundColor = () => {
    if (permissionInfo.required) {
      return colors.error + '20';
    }
    return colors.primary + '20';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        
        <TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: getIconBackgroundColor(),
                  },
                ]}
              >
                <IconSymbol
                  name={permissionInfo.icon as any}
                  size={32}
                  color={getIconColor()}
                />
              </View>
              
              <ThemedText
                style={[
                  styles.title,
                  { color: colors.textPrimary },
                ]}
              >
                {permissionInfo.title}
              </ThemedText>
              
              {permissionInfo.required && (
                <View style={[styles.requiredBadge, { backgroundColor: colors.error + '20' }]}>
                  <ThemedText style={[styles.requiredText, { color: colors.error }]}>
                    Required
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <ThemedText
                style={[
                  styles.description,
                  { color: colors.textSecondary },
                ]}
              >
                {permissionInfo.description}
              </ThemedText>
              
              <ThemedText
                style={[
                  styles.reason,
                  { color: colors.textPrimary },
                ]}
              >
                {permissionInfo.reason}
              </ThemedText>

              {!canAskAgain && (
                <View style={[styles.settingsHint, { backgroundColor: colors.warning + '20' }]}>
                  <IconSymbol
                    name="gear"
                    size={20}
                    color={colors.warning}
                    style={styles.settingsIcon}
                  />
                  <ThemedText
                    style={[
                      styles.settingsHintText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {permissionInfo.settingsHint}
                  </ThemedText>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              {canAskAgain ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.denyButton,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={onDeny}
                  >
                    <ThemedText
                      style={[
                        styles.buttonText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Not Now
                    </ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.allowButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={onAllow}
                  >
                    <ThemedText
                      style={[
                        styles.buttonText,
                        { color: colors.background },
                      ]}
                    >
                      Allow
                    </ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.denyButton,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={onDeny}
                  >
                    <ThemedText
                      style={[
                        styles.buttonText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Cancel
                    </ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.allowButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={onOpenSettings}
                  >
                    <IconSymbol
                      name="gear"
                      size={16}
                      color={colors.background}
                      style={styles.buttonIcon}
                    />
                    <ThemedText
                      style={[
                        styles.buttonText,
                        { color: colors.background },
                      ]}
                    >
                      Open Settings
                    </ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: Math.min(width - 40, 400),
    maxHeight: height * 0.8,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  requiredBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requiredText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  content: {
    paddingHorizontal: 24,
    maxHeight: 300,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  reason: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  settingsHint: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingsIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  settingsHintText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 48,
  },
  denyButton: {
    borderWidth: 1,
  },
  allowButton: {
    // Primary button styling handled by backgroundColor
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

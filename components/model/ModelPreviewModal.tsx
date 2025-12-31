/**
 * ModelPreviewModal Component
 * Modal for previewing models in full size
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Asset } from 'expo-asset';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { ModelInfo, getModelById } from '@/types/models';

const { width, height } = Dimensions.get('window');

export interface ModelPreviewModalProps {
  visible: boolean;
  modelId: string | null;
  onClose: () => void;
  onSelect?: (modelId: string) => void;
}

export const ModelPreviewModal: React.FC<ModelPreviewModalProps> = ({
  visible,
  modelId,
  onClose,
  onSelect,
}) => {
  const { colors, colorScheme } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Animation values
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Get model info
  const model = modelId ? getModelById(modelId as any) : null;

  // Load image when model changes
  useEffect(() => {
    if (!model) return;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setImageError(false);

        const asset = Asset.fromModule(model.imagePath);
        await asset.downloadAsync();

        setImageUri(asset.uri);
      } catch (error) {
        console.error('Error loading preview image:', error);
        setImageError(true);
        // Fallback to direct path
        try {
          setImageUri(model.imagePath);
          setImageError(false);
        } catch (fallbackError) {
          console.error('Fallback preview image loading failed:', fallbackError);
          setImageError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [model]);

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
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
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = () => {
    if (model && onSelect) {
      onSelect(model.id);
    }
    onClose();
  };

  const handleBackdropPress = () => {
    onClose();
  };

  if (!visible || !model) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: opacityAnim },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.headerContent}>
              <ThemedText style={[styles.title, { color: colors.textPrimary }]}>
                {model.name}
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                {model.description}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <IconSymbol name="xmark.circle.fill" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Preview Image Container */}
          <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading preview...
                </ThemedText>
              </View>
            ) : imageError ? (
              <View style={styles.errorContainer}>
                <IconSymbol name="exclamationmark.triangle" size={60} color={colors.error} />
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  Failed to load preview
                </ThemedText>
              </View>
            ) : (
              imageUri && (
                <View style={styles.previewImageContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                    onError={() => setImageError(true)}
                  />
                </View>
              )
            )}
          </View>

          {/* Action Buttons */}
          <View style={[styles.actionContainer, { backgroundColor: colors.cardBackground }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.primary }]}
              onPress={handleSelect}
              activeOpacity={0.8}
            >
              <IconSymbol name="checkmark" size={18} color="#fff" />
              <ThemedText style={styles.selectButtonText}>
                Select This Model
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  imageContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  previewImageContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    maxWidth: 250,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ModelPreviewModal;

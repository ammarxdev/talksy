/**
 * ModelCard Component
 * Beautiful card for displaying individual model options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { ModelInfo } from '@/types/models';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // Two cards per row with margins

export interface ModelCardProps {
  model: ModelInfo;
  isSelected: boolean;
  onSelect: (modelId: string) => void;
  onPreview?: (modelId: string) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isSelected,
  onSelect,
  onPreview,
}) => {
  const { colors, colorScheme } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Animation values
  const scaleAnim = new Animated.Value(1);
  const selectionAnim = new Animated.Value(isSelected ? 1 : 0);

  // Load image asset
  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setImageError(false);

        const asset = Asset.fromModule(model.imagePath);
        await asset.downloadAsync();

        setImageUri(asset.uri);
      } catch (error) {
        console.error('Error loading model image:', error);
        setImageError(true);
        // Fallback to direct path
        try {
          setImageUri(model.imagePath);
          setImageError(false);
        } catch (fallbackError) {
          console.error('Fallback image loading failed:', fallbackError);
          setImageError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [model.imagePath]);

  // Animate selection state changes
  useEffect(() => {
    Animated.spring(selectionAnim, {
      toValue: isSelected ? 1 : 0,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [isSelected]);

  // Handle press animation
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 100,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    onSelect(model.id);
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(model.id);
    }
  };

  // Get selection border color
  const selectionBorderColor = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const selectionBorderWidth = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 3],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          width: cardWidth,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            shadowColor: colors.textPrimary,
          },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Select ${model.name} as your voice assistant`}
        accessibilityHint={`${isSelected ? 'Currently selected. ' : ''}Tap to select this model`}
        accessibilityState={{ selected: isSelected }}
      >
        {/* Selection Border */}
        <Animated.View
          style={[
            styles.selectionBorder,
            {
              borderColor: selectionBorderColor,
              borderWidth: selectionBorderWidth,
            },
          ]}
        />

        {/* Model Image Container */}
        <View style={[styles.imageContainer, { backgroundColor: colors.surfaceVariant }]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading...
              </ThemedText>
            </View>
          ) : imageError ? (
            <View style={styles.errorContainer}>
              <IconSymbol name="exclamationmark.triangle" size={40} color={colors.error} />
              <ThemedText style={[styles.errorText, { color: colors.error }]}>
                Failed to load
              </ThemedText>
            </View>
          ) : (
            imageUri && (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.modelImage}
                  resizeMode="contain"
                  onError={() => setImageError(true)}
                />
                {/* Preview Button */}
                <TouchableOpacity
                  style={[styles.previewButton, { backgroundColor: colors.primary + '20' }]}
                  onPress={handlePreview}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Preview ${model.name} in full size`}
                  accessibilityHint="Opens a larger preview of this model"
                >
                  <IconSymbol name="magnifyingglass" size={16} color={colors.primary} />
                </TouchableOpacity>
              </>
            )
          )}
        </View>

        {/* Model Info */}
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <ThemedText style={[styles.modelName, { color: colors.textPrimary }]}>
              {model.name}
            </ThemedText>
            {isSelected && (
              <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                <IconSymbol name="checkmark" size={14} color="#fff" />
              </View>
            )}
          </View>
        </View>

        {/* Selection Overlay */}
        {isSelected && (
          <Animated.View
            style={[
              styles.selectionOverlay,
              {
                backgroundColor: colors.primary + '10',
                opacity: selectionAnim,
              },
            ]}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    zIndex: 2,
  },
  imageContainer: {
    height: 160,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelImage: {
    width: '90%',
    height: '90%',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  previewButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  infoContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modelDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});

export default ModelCard;

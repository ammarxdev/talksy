/**
 * Model Selection Screen
 * Beautiful interface for users to select their preferred voice assistant model
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useModel } from '@/contexts/ModelContext';
import { useAlert } from '@/contexts/AlertContext';
import { ModelCard } from '@/components/model/ModelCard';
import { ModelPreviewModal } from '@/components/model/ModelPreviewModal';
import { AVAILABLE_MODELS } from '@/types/models';

import { useVoiceAssistantContext } from '@/components/VoiceAssistantProviderWrapper';

export default function ModelSelectionScreen() {
  const { colors, colorScheme } = useTheme();
  const { selectedModel, setSelectedModel, isLoading: modelLoading, error } = useModel();
  const { showSuccess, showError } = useAlert();
  const { startConversation, assistantState } = useVoiceAssistantContext();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [previewModelId, setPreviewModelId] = useState<string | null>(null);
  const [isChangingModel, setIsChangingModel] = useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Handle model selection - now starts realtime call immediately
  const handleModelSelect = async (modelId: string) => {
    // Prevent selection if already changing model or call is active
    if (isChangingModel || isStartingCall || assistantState !== 'idle') {
      console.log('Model selection blocked - state:', { isChangingModel, isStartingCall, assistantState });
      return;
    }

    try {
      setIsChangingModel(true);
      setIsStartingCall(true);

      // First, update the selected model
      const success = await setSelectedModel(modelId as any);

      if (success) {
        // Show success message
        showSuccess(
          'Model selected! Starting realtime call...',
          'Model Updated'
        );

        // Start realtime call with Grok
        try {
          await startConversation();

          // Navigate back after call starts
          setTimeout(() => {
            router.back();
          }, 300);
        } catch (callError) {
          console.error('Failed to start realtime call:', callError);
          showError(
            'Model updated but failed to start realtime call. Please try again from the main screen.',
            'Call Start Failed'
          );

          // Still navigate back
          setTimeout(() => {
            router.back();
          }, 500);
        }
      } else {
        showError(
          'Failed to update your model selection. Please try again.',
          'Update Failed'
        );
      }
    } catch (error) {
      console.error('Model selection error:', error);
      showError(
        'An error occurred while updating your model selection.',
        'Error'
      );
    } finally {
      setIsChangingModel(false);
      setIsStartingCall(false);
    }
  };

  // Handle model preview
  const handleModelPreview = (modelId: string) => {
    setPreviewModelId(modelId);
  };

  // Close preview modal
  const handleClosePreview = () => {
    setPreviewModelId(null);
  };

  // Handle preview model selection
  const handlePreviewSelect = (modelId: string) => {
    handleModelSelect(modelId);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    // Add a small delay to show the refresh animation
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Show error alert if there's a model loading error
  useEffect(() => {
    if (error && !modelLoading) {
      showError(error, 'Model Loading Error');
    }
  }, [error, modelLoading, showError]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.surface }]}
      edges={['left', 'right', 'bottom']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Stack Screen Options */}
      <Stack.Screen
        options={{
          title: 'Choose Your Assistant',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.cardBackground,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
          headerShadowVisible: true,
        }}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header Section */}
        <ThemedView style={[styles.headerSection, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <IconSymbol name="sparkles" size={28} color={colors.primary} />
          </View>
          <ThemedText style={[styles.title, { color: colors.textPrimary }]}>
            Choose Your Voice Assistant
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select the model that best represents your personal assistant.
            You can change this anytime in your profile settings.
          </ThemedText>
        </ThemedView>

        {/* Models Grid */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Current Selection Indicator */}
          {!modelLoading && (
            <View style={[styles.currentSelectionContainer, { backgroundColor: colors.surfaceVariant }]}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
              <ThemedText style={[styles.currentSelectionText, { color: colors.textPrimary }]}>
                Currently selected: {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || 'Unknown'}
              </ThemedText>
            </View>
          )}

          {/* Models Grid */}
          <View style={styles.modelsGrid}>
            {AVAILABLE_MODELS.map((model, index) => (
              <Animated.View
                key={model.id}
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 20],
                        outputRange: [0, 20 + (index * 10)],
                      }),
                    },
                  ],
                }}
              >
                <ModelCard
                  model={model}
                  isSelected={model.id === selectedModel}
                  onSelect={handleModelSelect}
                  onPreview={handleModelPreview}
                />
              </Animated.View>
            ))}
          </View>

          {/* Help Text */}
          <View style={[styles.helpContainer, { backgroundColor: colors.surfaceVariant }]}>
            <IconSymbol name="lightbulb" size={20} color={colors.accent} />
            <ThemedText style={[styles.helpText, { color: colors.textSecondary }]}>
              Tap on any model to select it, or use the preview button to see it in full size.
              Your selection will be saved automatically.
            </ThemedText>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Preview Modal */}
      <ModelPreviewModal
        visible={!!previewModelId}
        modelId={previewModelId}
        onClose={handleClosePreview}
        onSelect={handlePreviewSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  currentSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  currentSelectionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  modelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
});

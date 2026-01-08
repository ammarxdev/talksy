import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { contactService, ContactFormData } from '@/services/ContactService';



// Contact categories
const CONTACT_CATEGORIES = [
  {
    id: 'Bug Report',
    title: 'Bug Report',
    description: 'Report a bug or technical issue',
    icon: 'exclamationmark.triangle' as const,
    color: '#FF6B6B',
  },
  {
    id: 'Feature Request',
    title: 'Feature Request',
    description: 'Suggest a new feature or improvement',
    icon: 'lightbulb' as const,
    color: '#4ECDC4',
  },
  {
    id: 'General Feedback',
    title: 'General Feedback',
    description: 'Share your thoughts and feedback',
    icon: 'message' as const,
    color: '#45B7D1',
  },
  {
    id: 'Technical Support',
    title: 'Technical Support',
    description: 'Get help with technical issues',
    icon: 'wrench' as const,
    color: '#96CEB4',
  },
  {
    id: 'Account Issues',
    title: 'Account Issues',
    description: 'Problems with your account',
    icon: 'person.circle' as const,
    color: '#FFEAA7',
  },
];

export default function ContactUsScreen() {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useAlert();
  const { colors } = useTheme();
  
  const [formData, setFormData] = useState<ContactFormData>({
    category: '',
    subject: '',
    message: '',
    userEmail: user?.email || '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [errors, setErrors] = useState<Partial<ContactFormData>>({});

  // Validation
  const validateForm = (): boolean => {
    const validation = contactService.validateFormData(formData);

    if (!validation.isValid) {
      const newErrors: Partial<ContactFormData> = {};
      validation.errors.forEach(error => {
        if (error.includes('category')) newErrors.category = error;
        else if (error.includes('Subject') || error.includes('subject')) newErrors.subject = error;
        else if (error.includes('Message') || error.includes('message')) newErrors.message = error;
        else if (error.includes('Email') || error.includes('email')) newErrors.userEmail = error;
      });
      setErrors(newErrors);
    } else {
      setErrors({});
    }

    return validation.isValid;
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setFormData(prev => ({ ...prev, category: categoryId }));
    setErrors(prev => ({ ...prev, category: undefined }));
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      showError('Please fix the errors in the form', 'Validation Error');
      return;
    }

    setIsLoading(true);

    try {
      showInfo('Sending your message...', 'Please Wait');

      const result = await contactService.submitContactForm(formData, user?.email);

      if (result.success) {
        if (result.redirected) {
          showSuccess(
            'Redirected to our website contact form. Please complete your message there.',
            'Redirected to Website'
          );
        } else {
          showSuccess(
            'Email sent successfully! Thank you for your feedback.',
            'Message Sent'
          );
        }

        // Reset form on success
        setFormData({
          category: '',
          subject: '',
          message: '',
          userEmail: user?.email || '',
        });
        setSelectedCategory('');

        // Navigate back after a short delay
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        showError(
          result.error || 'Failed to send email. Please try again or contact us directly at moin.iyan@gmail.com',
          'Send Failed'
        );
      }
    } catch (error) {
      console.error('Submit error:', error);
      showError(
        'An unexpected error occurred. Please try again.',
        'Error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Render category selection
  const renderCategorySelection = () => (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        What can we help you with?
      </ThemedText>
      {errors.category && (
        <Text style={styles.errorText}>{errors.category}</Text>
      )}
      <View style={styles.categoriesContainer}>
        {CONTACT_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              {
                backgroundColor: selectedCategory === category.id
                  ? colors.surfaceVariant
                  : colors.cardBackground,
                borderColor: selectedCategory === category.id
                  ? category.color
                  : colors.border,
                borderWidth: selectedCategory === category.id ? 2 : 1,
              }
            ]}
            onPress={() => handleCategorySelect(category.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
              <IconSymbol name={category.icon} size={24} color={category.color} />
            </View>
            <View style={styles.categoryContent}>
              <ThemedText style={[styles.categoryTitle, { color: colors.textPrimary }]}>
                {category.title}
              </ThemedText>
              <ThemedText style={[styles.categoryDescription, { color: colors.textSecondary }]}>
                {category.description}
              </ThemedText>
            </View>
            {selectedCategory === category.id && (
              <View style={[styles.selectedIndicator, { backgroundColor: category.color }]}>
                <IconSymbol name="checkmark" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render form fields
  const renderFormFields = () => (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Tell us more
      </ThemedText>

      {/* Email Field */}
      <View style={styles.fieldContainer}>
        <ThemedText style={[styles.fieldLabel, { color: colors.textPrimary }]}>
          Your Email
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.cardBackground,
              borderColor: errors.userEmail ? '#FF3B30' : colors.border,
              color: colors.textPrimary,
            }
          ]}
          value={formData.userEmail}
          onChangeText={(value) => handleFieldChange('userEmail', value)}
          placeholder="your.email@example.com"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!user?.email} // Disable if user is logged in
        />
        {errors.userEmail && (
          <Text style={styles.errorText}>{errors.userEmail}</Text>
        )}
        {user?.email && (
          <ThemedText style={[styles.fieldHint, { color: colors.textSecondary }]}>
            Using your account email
          </ThemedText>
        )}
      </View>

      {/* Subject Field */}
      <View style={styles.fieldContainer}>
        <ThemedText style={[styles.fieldLabel, { color: colors.textPrimary }]}>
          Subject
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.cardBackground,
              borderColor: errors.subject ? '#FF3B30' : colors.border,
              color: colors.textPrimary,
            }
          ]}
          value={formData.subject}
          onChangeText={(value) => handleFieldChange('subject', value)}
          placeholder="Brief description of your issue or request"
          placeholderTextColor={colors.textSecondary}
          maxLength={100}
        />
        {errors.subject && (
          <Text style={styles.errorText}>{errors.subject}</Text>
        )}
        <ThemedText style={[styles.fieldHint, { color: colors.textSecondary }]}>
          {formData.subject.length}/100 characters
        </ThemedText>
      </View>

      {/* Message Field */}
      <View style={styles.fieldContainer}>
        <ThemedText style={[styles.fieldLabel, { color: colors.textPrimary }]}>
          Message
        </ThemedText>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.cardBackground,
              borderColor: errors.message ? '#FF3B30' : colors.border,
              color: colors.textPrimary,
            }
          ]}
          value={formData.message}
          onChangeText={(value) => handleFieldChange('message', value)}
          placeholder="Please provide detailed information about your issue, request, or feedback..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={1000}
        />
        {errors.message && (
          <Text style={styles.errorText}>{errors.message}</Text>
        )}
        <ThemedText style={[styles.fieldHint, { color: colors.textSecondary }]}>
          {formData.message.length}/1000 characters
        </ThemedText>
      </View>
    </View>
  );

  // Render submit button
  const renderSubmitButton = () => (
    <View style={styles.submitSection}>
      <TouchableOpacity
        style={[
          styles.submitButton,
          {
            backgroundColor: isLoading ? colors.textSecondary : '#667eea',
            opacity: isLoading ? 0.7 : 1,
          }
        ]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <IconSymbol name="paperplane" size={20} color="#fff" />
        )}
        <Text style={styles.submitButtonText}>
          {isLoading ? 'Sending...' : 'Send Message'}
        </Text>
      </TouchableOpacity>

      <ThemedText style={[styles.submitHint, { color: colors.textSecondary }]}>
        We'll get back to you as soon as possible
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Stack.Screen
        options={{
          title: 'Contact Us',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderCategorySelection()}
          {selectedCategory && renderFormFields()}
          {selectedCategory && formData.subject && formData.message && renderSubmitButton()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoriesContainer: {
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 50,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  submitSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

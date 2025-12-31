import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
}

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    id: '1',
    category: 'Getting Started',
    question: 'How do I start using the voice assistant?',
    answer: 'Simply tap the microphone button on the main screen and start speaking. The assistant will listen to your question and provide a spoken response.',
    tags: ['start', 'begin', 'microphone', 'speak']
  },
  {
    id: '2',
    category: 'Getting Started',
    question: 'Do I need to create an account?',
    answer: 'Yes, you need to create an account to use the voice assistant. You can sign up with your email or use Google OAuth for quick registration.',
    tags: ['account', 'signup', 'register', 'google', 'email']
  },
  {
    id: '3',
    category: 'Getting Started',
    question: 'What permissions does the app need?',
    answer: 'The app requires microphone permission to record your voice and notification permission to send you alerts. Both are essential for the voice assistant functionality.',
    tags: ['permissions', 'microphone', 'notifications', 'privacy']
  },

  // Voice Features
  {
    id: '4',
    category: 'Voice Features',
    question: 'What languages are supported?',
    answer: 'Currently, the voice assistant supports English. We are working on adding support for more languages in future updates.',
    tags: ['language', 'english', 'multilingual', 'support']
  },
  {
    id: '5',
    category: 'Voice Features',
    question: 'Why is the assistant not understanding me?',
    answer: 'Make sure you speak clearly and in a quiet environment. Check that your microphone permission is enabled and your device microphone is working properly.',
    tags: ['understanding', 'microphone', 'clear', 'quiet', 'permission']
  },
  {
    id: '6',
    category: 'Voice Features',
    question: 'Can I turn off the voice response?',
    answer: 'Currently, voice responses are an integral part of the experience. We may add text-only mode in future updates based on user feedback.',
    tags: ['voice', 'response', 'text', 'audio', 'settings']
  },

  // Technical Issues
  {
    id: '7',
    category: 'Technical Issues',
    question: 'The app is not responding to my voice',
    answer: 'Check your microphone permissions, ensure you have a stable internet connection, and try restarting the app. If the issue persists, contact support.',
    tags: ['not responding', 'microphone', 'internet', 'restart', 'troubleshoot']
  },
  {
    id: '8',
    category: 'Technical Issues',
    question: 'Why do I get network errors?',
    answer: 'The voice assistant requires an internet connection to process your requests. Check your WiFi or mobile data connection and try again.',
    tags: ['network', 'error', 'internet', 'wifi', 'connection']
  },
  {
    id: '9',
    category: 'Technical Issues',
    question: 'The app crashes when I try to speak',
    answer: 'This might be due to insufficient device resources or a corrupted installation. Try closing other apps, restarting your device, or reinstalling the app.',
    tags: ['crash', 'speak', 'restart', 'reinstall', 'memory']
  },

  // Account & Privacy
  {
    id: '10',
    category: 'Account & Privacy',
    question: 'How is my voice data handled?',
    answer: 'Your voice recordings are processed securely and are not stored permanently. We use industry-standard encryption and follow strict privacy guidelines.',
    tags: ['privacy', 'voice', 'data', 'security', 'encryption']
  },
  {
    id: '11',
    category: 'Account & Privacy',
    question: 'Can I delete my account?',
    answer: 'Yes, you can delete your account from the Account Settings in your profile. This will permanently remove all your data from our servers.',
    tags: ['delete', 'account', 'remove', 'data', 'permanent']
  },
  {
    id: '12',
    category: 'Account & Privacy',
    question: 'How do I change my password?',
    answer: 'Go to Account Settings in your profile and select "Change Password". You can also use the "Forgot Password" option on the login screen.',
    tags: ['password', 'change', 'forgot', 'reset', 'account']
  },

  // Features & Updates
  {
    id: '13',
    category: 'Features & Updates',
    question: 'What can I ask the voice assistant?',
    answer: 'You can ask questions about various topics, request information, get help with tasks, or have casual conversations. The AI is designed to be helpful and informative.',
    tags: ['ask', 'questions', 'topics', 'information', 'conversation']
  },
  {
    id: '14',
    category: 'Features & Updates',
    question: 'Will there be new features added?',
    answer: 'Yes! We regularly update the app with new features and improvements. Enable notifications to stay informed about updates and new capabilities.',
    tags: ['features', 'updates', 'new', 'improvements', 'notifications']
  },
  {
    id: '15',
    category: 'Features & Updates',
    question: 'How do I provide feedback?',
    answer: 'You can contact us through the "Contact Us" option in the Support section of your profile, or rate the app in your device\'s app store.',
    tags: ['feedback', 'contact', 'support', 'rate', 'review']
  }
];

const CATEGORIES = Array.from(new Set(FAQ_DATA.map(item => item.category)));

export default function HelpFAQScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredFAQs = useMemo(() => {
    let filtered = FAQ_DATA;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const CategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <TouchableOpacity
          style={[
            styles.categoryChip,
            { backgroundColor: !selectedCategory ? colors.primary : colors.cardBackground },
            { borderColor: colors.border }
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[
            styles.categoryText,
            { color: !selectedCategory ? '#fff' : colors.textPrimary }
          ]}>
            All
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              { backgroundColor: selectedCategory === category ? colors.primary : colors.cardBackground },
              { borderColor: colors.border }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryText,
              { color: selectedCategory === category ? '#fff' : colors.textPrimary }
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const FAQItemComponent = ({ item }: { item: FAQItem }) => {
    const isExpanded = expandedItems.has(item.id);

    return (
      <ThemedView style={[styles.faqItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.faqHeader}
          onPress={() => toggleExpanded(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.faqHeaderContent}>
            <ThemedText style={[styles.faqQuestion, { color: colors.textPrimary }]}>
              {item.question}
            </ThemedText>
            <IconSymbol
              name={isExpanded ? "chevron.up" : "chevron.down"}
              size={20}
              color={colors.textSecondary}
            />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.faqAnswer}>
            <ThemedText style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
              {item.answer}
            </ThemedText>
          </View>
        )}
      </ThemedView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Stack.Screen
        options={{
          title: 'Help & FAQ',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search FAQs..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery && searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        <CategoryFilter />

        {/* FAQ List */}
        <ScrollView style={styles.faqList} showsVerticalScrollIndicator={false}>
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map(item => (
              <FAQItemComponent key={item.id} item={item} />
            ))
          ) : (
            <ThemedView style={[styles.noResults, { backgroundColor: colors.cardBackground }]}>
              <IconSymbol name="questionmark.circle" size={48} color={colors.textSecondary} />
              <ThemedText style={[styles.noResultsText, { color: colors.textSecondary }]}>
                No FAQs found matching your search
              </ThemedText>
              <ThemedText style={[styles.noResultsSubtext, { color: colors.textSecondary }]}>
                Try different keywords or browse all categories
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>

        {/* Contact Support */}
        <ThemedView style={[styles.contactSection, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <ThemedText style={[styles.contactTitle, { color: colors.textPrimary }]}>
            Still need help?
          </ThemedText>
          <ThemedText style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
            Can't find what you're looking for? Contact our support team.
          </ThemedText>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              // Navigate back to profile and scroll to contact section
              router.back();
            }}
          >
            <IconSymbol name="envelope" size={16} color="#fff" />
            <Text style={[styles.contactButtonText, { color: '#fff' }]}>Contact Support</Text>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryScroll: {
    paddingVertical: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  faqList: {
    flex: 1,
  },
  faqItem: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqHeader: {
    padding: 16,
  },
  faqHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswerText: {
    fontSize: 15,
    lineHeight: 22,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    marginTop: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  contactSection: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

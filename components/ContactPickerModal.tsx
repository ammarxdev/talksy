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
  Image,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { ContactSearchResult, PhoneNumberInfo } from '@/services/ContactCallingService';

export interface ContactPickerProps {
  visible: boolean;
  title?: string;
  contacts: ContactSearchResult[];
  searchQuery: string;
  onSelectContact: (contact: ContactSearchResult, phoneNumber: PhoneNumberInfo) => void;
  onCancel: () => void;
  dismissible?: boolean;
}

const { width, height } = Dimensions.get('window');

export default function ContactPickerModal({
  visible,
  title = 'Select Contact',
  contacts,
  searchQuery,
  onSelectContact,
  onCancel,
  dismissible = true,
}: ContactPickerProps) {
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

  const handleBackdropPress = () => {
    if (dismissible) {
      onCancel();
    }
  };

  const handleContactSelect = (contact: ContactSearchResult, phoneNumber: PhoneNumberInfo) => {
    onSelectContact(contact, phoneNumber);
  };

  const renderContactItem = (contact: ContactSearchResult, index: number) => {
    return (
      <View key={contact.id} style={[styles.contactItem, { borderColor: colors.border }]}>
        {/* Contact Header - Scrollable Area */}
        <View style={styles.scrollableArea}>
          <View style={styles.contactHeader}>
            {/* Contact Image */}
            <View style={[styles.avatarContainer, { backgroundColor: colors.surfaceVariant }]}>
              {contact.image?.uri ? (
                <Image source={{ uri: contact.image.uri }} style={styles.avatar} />
              ) : (
                <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
                  {contact.name.charAt(0).toUpperCase()}
                </ThemedText>
              )}
            </View>

            {/* Contact Info */}
            <View style={styles.contactInfo}>
              <ThemedText style={styles.contactName}>{contact.name}</ThemedText>
              {contact.company && (
                <ThemedText style={[styles.contactCompany, { color: colors.textSecondary }]}>
                  {contact.company}
                </ThemedText>
              )}
              {contact.searchScore !== undefined && contact.searchScore > 0 && (
                <ThemedText style={[styles.searchScore, { color: colors.textSecondary }]}>
                  Match: {Math.round((1 - contact.searchScore) * 100)}%
                </ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Phone Numbers */}
        <View style={styles.phoneNumbersContainer}>
          {contact.phoneNumbers.map((phone, phoneIndex) => (
            <TouchableOpacity
              key={phoneIndex}
              style={[
                styles.phoneNumberButton,
                {
                  backgroundColor: phone.isPrimary ? colors.tint : colors.surfaceVariant,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleContactSelect(contact, phone)}
              activeOpacity={0.8}
            >
              <View style={styles.phoneNumberContent}>
                <ThemedText
                  style={[
                    styles.phoneNumberLabel,
                    { color: phone.isPrimary ? 'white' : colors.textPrimary },
                  ]}
                >
                  {phone.label}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.phoneNumber,
                    { color: phone.isPrimary ? 'white' : colors.textSecondary },
                  ]}
                >
                  {phone.number}
                </ThemedText>
              </View>
              {phone.isPrimary && (
                <View style={styles.primaryBadge}>
                  <ThemedText style={styles.primaryBadgeText}>Primary</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

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
              backgroundColor: colors.background,
              borderColor: colors.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
              {/* Header */}
              <View style={[styles.header, { borderColor: colors.border }]}>
                <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
                  <ThemedText style={[styles.icon, { color: colors.tint }]}>📞</ThemedText>
                </View>
                <View style={styles.headerText}>
                  <ThemedText style={styles.title}>{title}</ThemedText>
                  <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Found {contacts.length} contact{contacts.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </ThemedText>
                </View>
              </View>

              {/* Contact List */}
              <ScrollView
                style={styles.contactList}
                showsVerticalScrollIndicator={false}
                bounces={true}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.contactListContent}
                directionalLockEnabled={true}
                alwaysBounceVertical={true}
              >
                {contacts.map((contact, index) => renderContactItem(contact, index))}
              </ScrollView>

              {/* Cancel Button */}
              <View style={[styles.footer, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.surfaceVariant }]}
                  onPress={onCancel}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
              </View>
        </Animated.View>
      </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    maxHeight: height * 0.8,
    borderRadius: 20,
    borderWidth: 0.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  icon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  contactList: {
    maxHeight: height * 0.5,
  },
  contactListContent: {
    paddingBottom: 10,
    paddingTop: 5,
  },
  contactItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  scrollableArea: {
    flex: 1,
    paddingVertical: 4,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 60,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactCompany: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  searchScore: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  phoneNumbersContainer: {
    gap: 8,
    marginTop: 4,
  },
  phoneNumberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 2,
  },
  phoneNumberContent: {
    flex: 1,
  },
  phoneNumberLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 16,
    fontFamily: 'monospace',
  },
  primaryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

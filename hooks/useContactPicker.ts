import { useState, useCallback } from 'react';
import { ContactSearchResult, PhoneNumberInfo } from '@/services/ContactCallingService';

export interface ContactPickerState {
  visible: boolean;
  contacts: ContactSearchResult[];
  searchQuery: string;
  title: string;
  onSelectContact: ((contact: ContactSearchResult, phoneNumber: PhoneNumberInfo) => void) | null;
  onCancel: (() => void) | null;
}

export interface UseContactPickerReturn {
  contactPickerState: ContactPickerState;
  showContactPicker: (
    contacts: ContactSearchResult[],
    searchQuery: string,
    onSelectContact: (contact: ContactSearchResult, phoneNumber: PhoneNumberInfo) => void,
    title?: string,
    onCancel?: () => void
  ) => void;
  hideContactPicker: () => void;
}

export function useContactPicker(): UseContactPickerReturn {
  const [contactPickerState, setContactPickerState] = useState<ContactPickerState>({
    visible: false,
    contacts: [],
    searchQuery: '',
    title: 'Select Contact',
    onSelectContact: null,
    onCancel: null,
  });

  const showContactPicker = useCallback((
    contacts: ContactSearchResult[],
    searchQuery: string,
    onSelectContact: (contact: ContactSearchResult, phoneNumber: PhoneNumberInfo) => void,
    title: string = 'Select Contact',
    onCancel?: () => void
  ) => {
    setContactPickerState({
      visible: true,
      contacts,
      searchQuery,
      title,
      onSelectContact,
      onCancel: onCancel || null,
    });
  }, []);

  const hideContactPicker = useCallback(() => {
    setContactPickerState(prev => ({
      ...prev,
      visible: false,
      onSelectContact: null,
    }));
  }, []);

  return {
    contactPickerState,
    showContactPicker,
    hideContactPicker,
  };
}

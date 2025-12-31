import React, { createContext, useContext, ReactNode } from 'react';
import CustomAlert, { AlertType, AlertButton } from '@/components/CustomAlert';
import ContactPickerModal from '@/components/ContactPickerModal';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useContactPicker } from '@/hooks/useContactPicker';
import { ContactSearchResult, PhoneNumberInfo } from '@/services/ContactCallingService';

interface AlertConfig {
  title?: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  dismissible?: boolean;
}

interface AlertContextType {
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
  showSuccess: (message: string, title?: string, buttons?: AlertButton[]) => void;
  showError: (message: string, title?: string, buttons?: AlertButton[]) => void;
  showWarning: (message: string, title?: string, buttons?: AlertButton[]) => void;
  showInfo: (message: string, title?: string, buttons?: AlertButton[]) => void;
  showVoice: (message: string, title?: string, buttons?: AlertButton[]) => void;
  showConfirmation: (
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    title?: string
  ) => void;
  showContactPicker: (
    contacts: ContactSearchResult[],
    searchQuery: string,
    onSelectContact: (contact: ContactSearchResult, phoneNumber: PhoneNumberInfo) => void,
    title?: string,
    onCancel?: () => void
  ) => void;
  hideContactPicker: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const {
    alertState,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showVoice,
    showConfirmation,
  } = useCustomAlert();

  const {
    contactPickerState,
    showContactPicker,
    hideContactPicker,
  } = useContactPicker();

  const value: AlertContextType = {
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showVoice,
    showConfirmation,
    showContactPicker,
    hideContactPicker,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onDismiss={hideAlert}
        dismissible={alertState.dismissible}
      />
      <ContactPickerModal
        visible={contactPickerState.visible}
        title={contactPickerState.title}
        contacts={contactPickerState.contacts}
        searchQuery={contactPickerState.searchQuery}
        onSelectContact={(contact, phoneNumber) => {
          contactPickerState.onSelectContact?.(contact, phoneNumber);
          hideContactPicker();
        }}
        onCancel={() => {
          contactPickerState.onCancel?.();
          hideContactPicker();
        }}
        dismissible={true}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export default AlertProvider;

import { useState, useCallback } from 'react';
import { AlertType, AlertButton } from '@/components/CustomAlert';

interface AlertConfig {
  title?: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  dismissible?: boolean;
}

interface AlertState extends AlertConfig {
  visible: boolean;
}

export const useCustomAlert = () => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    message: '',
    type: 'info',
    buttons: [{ text: 'OK', style: 'default' }],
    dismissible: true,
  });

  const showAlert = useCallback((config: AlertConfig) => {
    setAlertState({
      visible: true,
      title: config.title,
      message: config.message,
      type: config.type || 'info',
      buttons: config.buttons || [{ text: 'OK', style: 'default' }],
      dismissible: config.dismissible !== false,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // Convenience methods for different alert types
  const showSuccess = useCallback((message: string, title?: string, buttons?: AlertButton[]) => {
    showAlert({
      title,
      message,
      type: 'success',
      buttons,
    });
  }, [showAlert]);

  const showError = useCallback((message: string, title?: string, buttons?: AlertButton[]) => {
    showAlert({
      title,
      message,
      type: 'error',
      buttons,
    });
  }, [showAlert]);

  const showWarning = useCallback((message: string, title?: string, buttons?: AlertButton[]) => {
    showAlert({
      title,
      message,
      type: 'warning',
      buttons,
    });
  }, [showAlert]);

  const showInfo = useCallback((message: string, title?: string, buttons?: AlertButton[]) => {
    showAlert({
      title,
      message,
      type: 'info',
      buttons,
    });
  }, [showAlert]);

  const showVoice = useCallback((message: string, title?: string, buttons?: AlertButton[]) => {
    showAlert({
      title,
      message,
      type: 'voice',
      buttons,
    });
  }, [showAlert]);

  // Method to show confirmation dialog
  const showConfirmation = useCallback((
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    title?: string
  ) => {
    showAlert({
      title,
      message,
      type: 'warning',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: onConfirm,
        },
      ],
    });
  }, [showAlert]);

  return {
    alertState,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showVoice,
    showConfirmation,
  };
};

export default useCustomAlert;

import React, { createContext, useContext, ReactNode } from 'react';
import PermissionRequestModal from '@/components/PermissionRequestModal';
import { usePermissionRequest } from '@/hooks/usePermissionRequest';
import { PermissionType, PermissionResult, permissionManager } from '@/services/PermissionManager';
import { useAlert } from '@/contexts/AlertContext';

export interface PermissionContextType {
  // Core permission methods
  requestPermission: (type: PermissionType) => Promise<PermissionResult>;
  checkPermission: (type: PermissionType) => Promise<PermissionResult>;
  requestMultiplePermissions: (types: PermissionType[]) => Promise<Record<PermissionType, PermissionResult>>;
  
  // Utility methods
  areRequiredPermissionsGranted: () => Promise<boolean>;
  getMissingRequiredPermissions: () => Promise<PermissionType[]>;
  openAppSettings: () => Promise<void>;
  
  // Error handling
  handlePermissionError: (error: Error, permissionType: PermissionType) => void;
  
  // Status methods
  isPermissionRequired: (type: PermissionType) => boolean;
  getPermissionStatusSummary: () => Promise<Record<PermissionType, PermissionResult>>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const permissionRequest = usePermissionRequest();
  const { showError, showWarning } = useAlert();

  const handlePermissionError = (error: Error, permissionType: PermissionType) => {
    console.error(`Permission error for ${permissionType}:`, error);
    
    const permissionInfo = permissionManager.getPermissionInfo(permissionType);
    
    // Show user-friendly error message
    if (error.message.includes('not available')) {
      showError(
        `${permissionInfo.title} is not available on this device.`,
        'Feature Unavailable'
      );
    } else if (error.message.includes('permission')) {
      showWarning(
        `${permissionInfo.title} is required for this feature to work properly.`,
        'Permission Required',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request Permission',
            onPress: () => permissionRequest.requestPermission(permissionType),
          },
        ]
      );
    } else {
      showError(
        `There was an issue with ${permissionInfo.title}. Please try again.`,
        'Permission Error'
      );
    }
  };

  const requestPermissionWithErrorHandling = async (type: PermissionType): Promise<PermissionResult> => {
    try {
      return await permissionRequest.requestPermission(type);
    } catch (error) {
      handlePermissionError(error as Error, type);
      return {
        status: 'denied',
        granted: false,
        canAskAgain: true,
      };
    }
  };

  const requestMultiplePermissions = async (types: PermissionType[]): Promise<Record<PermissionType, PermissionResult>> => {
    const results: Record<string, PermissionResult> = {};
    
    // Request permissions sequentially to avoid overwhelming the user
    for (const type of types) {
      try {
        results[type] = await permissionRequest.requestPermission(type);
      } catch (error) {
        handlePermissionError(error as Error, type);
        results[type] = {
          status: 'denied',
          granted: false,
          canAskAgain: true,
        };
      }
    }
    
    return results as Record<PermissionType, PermissionResult>;
  };

  const checkPermission = async (type: PermissionType): Promise<PermissionResult> => {
    try {
      return await permissionManager.checkPermission(type);
    } catch (error) {
      handlePermissionError(error as Error, type);
      return {
        status: 'denied',
        granted: false,
        canAskAgain: true,
      };
    }
  };

  const areRequiredPermissionsGranted = async (): Promise<boolean> => {
    try {
      return await permissionManager.areRequiredPermissionsGranted();
    } catch (error) {
      console.error('Failed to check required permissions:', error);
      return false;
    }
  };

  const getMissingRequiredPermissions = async (): Promise<PermissionType[]> => {
    try {
      return await permissionManager.getMissingRequiredPermissions();
    } catch (error) {
      console.error('Failed to get missing permissions:', error);
      return [];
    }
  };

  const openAppSettings = async (): Promise<void> => {
    try {
      await permissionManager.openAppSettings();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Unable to open settings',
        'Settings Error'
      );
    }
  };

  const isPermissionRequired = (type: PermissionType): boolean => {
    return permissionManager.isPermissionRequired(type);
  };

  const getPermissionStatusSummary = async (): Promise<Record<PermissionType, PermissionResult>> => {
    try {
      return await permissionManager.getPermissionStatusSummary();
    } catch (error) {
      console.error('Failed to get permission status summary:', error);
      return {} as Record<PermissionType, PermissionResult>;
    }
  };

  const value: PermissionContextType = {
    requestPermission: requestPermissionWithErrorHandling,
    checkPermission,
    requestMultiplePermissions,
    areRequiredPermissionsGranted,
    getMissingRequiredPermissions,
    openAppSettings,
    handlePermissionError,
    isPermissionRequired,
    getPermissionStatusSummary,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
      <PermissionRequestModal
        visible={permissionRequest.state.visible}
        permissionType={permissionRequest.state.permissionType || 'microphone'}
        onAllow={permissionRequest.handleAllow}
        onDeny={permissionRequest.handleDeny}
        onOpenSettings={permissionRequest.handleOpenSettings}
        canAskAgain={permissionRequest.state.canAskAgain}
        dismissible={true}
      />
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export default PermissionProvider;

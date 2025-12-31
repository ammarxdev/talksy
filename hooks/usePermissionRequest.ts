import { useState, useCallback } from 'react';
import { PermissionType, PermissionResult, permissionManager } from '@/services/PermissionManager';

export interface PermissionRequestState {
  visible: boolean;
  permissionType: PermissionType | null;
  canAskAgain: boolean;
  isRequesting: boolean;
}

export interface UsePermissionRequestReturn {
  state: PermissionRequestState;
  requestPermission: (type: PermissionType) => Promise<PermissionResult>;
  handleAllow: () => Promise<void>;
  handleDeny: () => void;
  handleOpenSettings: () => Promise<void>;
  hideModal: () => void;
}

export function usePermissionRequest(): UsePermissionRequestReturn {
  const [state, setState] = useState<PermissionRequestState>({
    visible: false,
    permissionType: null,
    canAskAgain: true,
    isRequesting: false,
  });

  const [resolvePromise, setResolvePromise] = useState<((result: PermissionResult) => void) | null>(null);

  const hideModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      visible: false,
      permissionType: null,
      canAskAgain: true,
      isRequesting: false,
    }));
  }, []);

  const requestPermission = useCallback(async (type: PermissionType): Promise<PermissionResult> => {
    // First check current permission status
    const currentStatus = await permissionManager.checkPermission(type);
    
    // If already granted, return immediately
    if (currentStatus.granted) {
      return currentStatus;
    }

    // If we can't ask again, show settings modal
    if (!currentStatus.canAskAgain) {
      setState({
        visible: true,
        permissionType: type,
        canAskAgain: false,
        isRequesting: false,
      });

      return new Promise<PermissionResult>((resolve) => {
        setResolvePromise(() => resolve);
      });
    }

    // Show permission request modal
    setState({
      visible: true,
      permissionType: type,
      canAskAgain: true,
      isRequesting: false,
    });

    return new Promise<PermissionResult>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleAllow = useCallback(async () => {
    if (!state.permissionType || !resolvePromise) return;

    setState(prev => ({ ...prev, isRequesting: true }));

    try {
      const result = await permissionManager.requestPermission(state.permissionType);
      resolvePromise(result);
      setResolvePromise(null);
      hideModal();
    } catch (error) {
      console.error('Failed to request permission:', error);
      const errorResult: PermissionResult = {
        status: 'denied',
        granted: false,
        canAskAgain: true,
      };
      resolvePromise(errorResult);
      setResolvePromise(null);
      hideModal();
    }
  }, [state.permissionType, resolvePromise, hideModal]);

  const handleDeny = useCallback(() => {
    if (!resolvePromise) return;

    const deniedResult: PermissionResult = {
      status: 'denied',
      granted: false,
      canAskAgain: state.canAskAgain,
    };

    resolvePromise(deniedResult);
    setResolvePromise(null);
    hideModal();
  }, [resolvePromise, state.canAskAgain, hideModal]);

  const handleOpenSettings = useCallback(async () => {
    if (!resolvePromise) return;

    try {
      await permissionManager.openAppSettings();
      
      // After opening settings, check permission status again
      // This is a bit tricky because we don't know when the user returns
      // For now, we'll resolve with the current status
      if (state.permissionType) {
        const result = await permissionManager.checkPermission(state.permissionType);
        resolvePromise(result);
      } else {
        const deniedResult: PermissionResult = {
          status: 'denied',
          granted: false,
          canAskAgain: false,
        };
        resolvePromise(deniedResult);
      }
    } catch (error) {
      console.error('Failed to open settings:', error);
      const errorResult: PermissionResult = {
        status: 'denied',
        granted: false,
        canAskAgain: false,
      };
      resolvePromise(errorResult);
    }

    setResolvePromise(null);
    hideModal();
  }, [resolvePromise, state.permissionType, hideModal]);

  return {
    state,
    requestPermission,
    handleAllow,
    handleDeny,
    handleOpenSettings,
    hideModal,
  };
}

export default usePermissionRequest;

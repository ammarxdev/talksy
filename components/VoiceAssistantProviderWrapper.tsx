import React, { createContext, useContext, ReactNode } from 'react';
import { useVoiceAssistantFlowNative, UseVoiceAssistantFlowReturn } from '@/hooks/useVoiceAssistantFlowNative';

// Use the return type of the hook as the context type
export type VoiceAssistantContextType = UseVoiceAssistantFlowReturn;

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export function VoiceAssistantProvider({ children }: { children: ReactNode }) {
  // Initialize the voice assistant flow here - ensuring single instance
  const voiceAssistant = useVoiceAssistantFlowNative();

  return (
    <VoiceAssistantContext.Provider value={voiceAssistant}>
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistantContext() {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error('useVoiceAssistantContext must be used within a VoiceAssistantProvider');
  }
  return context;
}

// Deprecated: No-op function for backward compatibility during refactor
export function updateVoiceAssistantState() {
  // No-op
}

export default VoiceAssistantProvider;

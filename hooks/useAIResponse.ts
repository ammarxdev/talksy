import { useState, useCallback } from 'react';
import { aiResponseService, AIResponse, ConversationContext } from '@/services/AIResponseService';

export interface UseAIResponseReturn {
  generateResponse: (message: string) => Promise<AIResponse | null>;
  isGenerating: boolean;
  error: string | null;
  lastResponse: AIResponse | null;
  conversationHistory: ConversationContext;
  clearHistory: () => void;
}

export function useAIResponse(): UseAIResponseReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationContext>(
    aiResponseService.getHistory()
  );

  const generateResponse = useCallback(async (message: string): Promise<AIResponse | null> => {
    try {
      setIsGenerating(true);
      setError(null);

      // Check if service is configured
      if (!aiResponseService.isConfigured()) {
        throw new Error('AI service is not properly configured. Please check your Gemini API key.');
      }

      // Generate the response
      const response = await aiResponseService.generateResponse(message);

      setLastResponse(response);
      setConversationHistory(aiResponseService.getHistory());

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI response';
      setError(errorMessage);
      console.error('AI response generation error:', err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    aiResponseService.clearHistory();
    setConversationHistory(aiResponseService.getHistory());
    setLastResponse(null);
    setError(null);
  }, []);

  return {
    generateResponse,
    isGenerating,
    error,
    lastResponse,
    conversationHistory,
    clearHistory,
  };
}

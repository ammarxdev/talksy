/**
 * Model Components Index
 * Centralized exports for model selection components
 */

export { ModelCard } from './ModelCard';
export { ModelPreviewModal } from './ModelPreviewModal';
export type { ModelCardProps } from './ModelCard';
export type { ModelPreviewModalProps } from './ModelPreviewModal';

// Re-export types for convenience
export type {
  ModelId,
  ModelInfo,
  ModelSelectionSettings,
  ModelSelectionError,
} from '@/types/models';

export {
  AVAILABLE_MODELS,
  getModelById,
  getDefaultModel,
  isValidModelId,
} from '@/types/models';

/**
 * Contact Form Configuration
 * Configuration for contact form functionality using native mail composer + web redirect
 */

// Contact form settings
export const CONTACT_CONFIG = {
  RECIPIENT_EMAIL: 'hur3561@gmail.com',
  WEB_CONTACT_URL: 'https://bbrewtech.com/contact/',
  MAX_SUBJECT_LENGTH: 100,
  MAX_MESSAGE_LENGTH: 1000,
  MIN_SUBJECT_LENGTH: 5,
  MIN_MESSAGE_LENGTH: 10,
};

// Contact analytics interface
export interface ContactAnalytics {
  category: string;
  timestamp: string;
  user_email: string;
  success: boolean;
  method: 'mail_composer' | 'web_redirect';
  error?: string;
}

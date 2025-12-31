/**
 * Contact Service
 * Handles contact form submissions, email sending, and analytics
 */

import * as MailComposer from 'expo-mail-composer';
import * as Linking from 'expo-linking';
import { supabase } from '@/config/supabase';
import {
  CONTACT_CONFIG,
  ContactAnalytics
} from '@/config/contact';

export interface ContactFormData {
  category: string;
  subject: string;
  message: string;
  userEmail: string;
}

export interface ContactSubmissionResult {
  success: boolean;
  method?: 'mail_composer' | 'web_redirect';
  error?: string;
  redirected?: boolean;
}

class ContactService {
  private isMailAvailable: boolean = false;

  constructor() {
    this.checkMailAvailability();
  }

  /**
   * Check if native mail composer is available
   */
  async checkMailAvailability(): Promise<boolean> {
    try {
      this.isMailAvailable = await MailComposer.isAvailableAsync();
      return this.isMailAvailable;
    } catch (error) {
      this.isMailAvailable = false;
      return false;
    }
  }

  /**
   * Send email via native mail composer
   */
  private async sendViaMailComposer(
    formData: ContactFormData,
    userEmail?: string
  ): Promise<boolean> {
    try {
      const subject = `[${formData.category}] ${formData.subject}`;
      
      const body = `
Category: ${formData.category}
From: ${formData.userEmail}
User Account: ${userEmail || 'Anonymous'}

Message:
${formData.message}

---
Sent from Voice Assistant App
Timestamp: ${new Date().toISOString()}
      `.trim();

      const result = await MailComposer.composeAsync({
        recipients: [CONTACT_CONFIG.RECIPIENT_EMAIL],
        subject,
        body,
        isHtml: false,
      });

      return result.status === MailComposer.MailComposerStatus.SENT;
    } catch (error) {
      console.error('Mail composer error:', error);
      return false;
    }
  }

  /**
   * Redirect to web contact form as fallback
   */
  private async redirectToWebContact(
    formData: ContactFormData,
    _userEmail?: string
  ): Promise<boolean> {
    try {
      // Create URL with pre-filled data
      const contactUrl = CONTACT_CONFIG.WEB_CONTACT_URL;
      const params = new URLSearchParams({
        category: formData.category,
        subject: formData.subject,
        message: formData.message,
        email: formData.userEmail,
        source: 'voice_assistant_app'
      });

      const fullUrl = `${contactUrl}?${params.toString()}`;

      // Open the contact page in browser
      const canOpen = await Linking.canOpenURL(fullUrl);
      if (canOpen) {
        await Linking.openURL(fullUrl);
        return true;
      } else {
        // Fallback to basic URL without params
        await Linking.openURL(contactUrl);
        return true;
      }
    } catch (error) {
      console.error('Web redirect error:', error);
      return false;
    }
  }

  /**
   * Log contact submission analytics
   */
  private async logAnalytics(
    formData: ContactFormData,
    result: ContactSubmissionResult,
    userEmail?: string
  ): Promise<void> {
    // If Supabase isn't configured, skip analytics logging
    if (!supabase) {
      return;
    }
    try {
      const analytics: ContactAnalytics = {
        category: formData.category,
        timestamp: new Date().toISOString(),
        user_email: userEmail || 'anonymous',
        success: result.success,
        method: result.method || 'web_redirect',
        error: result.error,
      };

      // Store in Supabase for analytics
      const { error } = await supabase
        .from('contact_analytics')
        .insert([analytics]);

      if (error) {
        // Analytics logging failed - continue silently
      }
    } catch (error) {
      // Analytics logging error - continue silently
    }
  }

  /**
   * Submit contact form with hybrid approach
   */
  async submitContactForm(
    formData: ContactFormData,
    userEmail?: string
  ): Promise<ContactSubmissionResult> {
    let result: ContactSubmissionResult = { success: false };

    try {
      // Refresh mail availability
      await this.checkMailAvailability();

      // Try native mail composer first if available
      if (this.isMailAvailable) {
        const success = await this.sendViaMailComposer(formData, userEmail);
        
        if (success) {
          result = { success: true, method: 'mail_composer' };
        } else {
          // Fallback to web redirect if mail composer fails
          const webRedirectSuccess = await this.redirectToWebContact(formData, userEmail);
          result = {
            success: webRedirectSuccess,
            method: 'web_redirect',
            redirected: webRedirectSuccess,
            error: webRedirectSuccess ? undefined : 'Web redirect fallback failed'
          };
        }
      } else {
        // Use web redirect directly if mail composer not available
        const success = await this.redirectToWebContact(formData, userEmail);
        result = {
          success,
          method: 'web_redirect',
          redirected: success,
          error: success ? undefined : 'Web redirect failed'
        };
      }

      // Log analytics
      await this.logAnalytics(formData, result, userEmail);

      return result;
    } catch (error) {
      console.error('Contact form submission error:', error);
      result = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      // Log failed attempt
      await this.logAnalytics(formData, result, userEmail);
      
      return result;
    }
  }

  /**
   * Validate contact form data
   */
  validateFormData(formData: ContactFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!formData.category) {
      errors.push('Please select a category');
    }

    if (!formData.subject.trim()) {
      errors.push('Subject is required');
    } else if (formData.subject.trim().length < CONTACT_CONFIG.MIN_SUBJECT_LENGTH) {
      errors.push(`Subject must be at least ${CONTACT_CONFIG.MIN_SUBJECT_LENGTH} characters`);
    } else if (formData.subject.length > CONTACT_CONFIG.MAX_SUBJECT_LENGTH) {
      errors.push(`Subject must be less than ${CONTACT_CONFIG.MAX_SUBJECT_LENGTH} characters`);
    }

    if (!formData.message.trim()) {
      errors.push('Message is required');
    } else if (formData.message.trim().length < CONTACT_CONFIG.MIN_MESSAGE_LENGTH) {
      errors.push(`Message must be at least ${CONTACT_CONFIG.MIN_MESSAGE_LENGTH} characters`);
    } else if (formData.message.length > CONTACT_CONFIG.MAX_MESSAGE_LENGTH) {
      errors.push(`Message must be less than ${CONTACT_CONFIG.MAX_MESSAGE_LENGTH} characters`);
    }

    if (!formData.userEmail.trim()) {
      errors.push('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(formData.userEmail)) {
      errors.push('Please enter a valid email address');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get contact form statistics (for admin/analytics)
   */
  async getContactStats(): Promise<any> {
    try {
      // If Supabase isn't configured, return null (no stats available)
      if (!supabase) {
        return null;
      }
      const { data, error } = await supabase
        .from('contact_analytics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to fetch contact stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Contact stats error:', error);
      return null;
    }
  }
}

// Singleton instance
export const contactService = new ContactService();

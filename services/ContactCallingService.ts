/**
 * Contact Calling Service
 * Handles contact access, search, and phone number management for voice calling functionality
 */

import * as Contacts from 'expo-contacts';
import Fuse, { FuseResult } from 'fuse.js';
import { permissionManager } from './PermissionManager';

export interface ContactSearchResult {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers: PhoneNumberInfo[];
  image?: ContactImage;
  company?: string;
  searchScore?: number;
}

export interface PhoneNumberInfo {
  id?: string;
  number: string;
  label: string;
  isPrimary?: boolean;
  formattedNumber: string; // Cleaned number for dialing
}

export interface ContactImage {
  uri?: string;
  base64?: string;
  width?: number;
  height?: number;
}

export interface ContactSearchOptions {
  maxResults?: number;
  includeCompanies?: boolean;
  fuzzyThreshold?: number;
}

export interface ContactPermissionStatus {
  granted: boolean;
  status: string;
  canAskAgain?: boolean;
  accessPrivileges?: 'all' | 'limited' | 'none';
}

class ContactCallingService {
  private contactsCache: ContactSearchResult[] = [];
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private fuse: Fuse<ContactSearchResult> | null = null;

  /**
   * Check and request contacts permissions
   * This method should not be called directly - use the PermissionContext instead
   * @deprecated Use PermissionContext.requestPermission('contacts') instead
   */
  async requestPermissions(): Promise<ContactPermissionStatus> {
    try {
      // Use the new permission manager for consistent permission handling
      const result = await permissionManager.requestPermission('contacts');

      return {
        granted: result.granted,
        status: result.status,
        canAskAgain: result.canAskAgain,
      };
    } catch (error) {
      console.error('Error requesting contacts permissions:', error);
      return {
        granted: false,
        status: 'error',
      };
    }
  }

  /**
   * Get current permission status without requesting
   */
  async getPermissionStatus(): Promise<ContactPermissionStatus> {
    try {
      // Use the new permission manager for consistent permission handling
      const result = await permissionManager.checkPermission('contacts');

      return {
        granted: result.granted,
        status: result.status,
        canAskAgain: result.canAskAgain,
      };
    } catch (error) {
      console.error('Error getting contacts permissions:', error);
      return {
        granted: false,
        status: 'error',
      };
    }
  }

  /**
   * Load and cache all contacts
   */
  private async loadContacts(): Promise<ContactSearchResult[]> {
    try {
      // Check if cache is still valid
      if (this.contactsCache.length > 0 && this.lastCacheUpdate) {
        const cacheAge = Date.now() - this.lastCacheUpdate.getTime();
        if (cacheAge < this.CACHE_DURATION) {
          console.log('Using cached contacts');
          return this.contactsCache;
        }
      }

      console.log('Loading contacts from device...');
      
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Image,
          Contacts.Fields.Company,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      // Transform contacts to our format
      this.contactsCache = data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => this.transformContact(contact));

      this.lastCacheUpdate = new Date();
      
      // Initialize Fuse search
      this.initializeFuseSearch();
      
      console.log(`Loaded ${this.contactsCache.length} contacts with phone numbers`);
      return this.contactsCache;
    } catch (error) {
      console.error('Error loading contacts:', error);
      throw new Error(`Failed to load contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transform Expo contact to our format
   */
  private transformContact(contact: Contacts.Contact): ContactSearchResult {
    const phoneNumbers: PhoneNumberInfo[] = (contact.phoneNumbers || []).map((phone, index) => ({
      id: phone.id,
      number: phone.number || '',
      label: phone.label || 'Phone',
      isPrimary: phone.isPrimary || index === 0,
      formattedNumber: this.formatPhoneNumber(phone.number || ''),
    }));

    return {
      id: contact.id || `contact_${Date.now()}_${Math.random()}`,
      name: contact.name || this.buildDisplayName(contact),
      firstName: contact.firstName,
      lastName: contact.lastName,
      phoneNumbers,
      image: contact.image ? {
        uri: contact.image.uri,
        base64: contact.image.base64,
        width: contact.image.width,
        height: contact.image.height,
      } : undefined,
      company: contact.company,
    };
  }

  /**
   * Build display name from available name fields
   */
  private buildDisplayName(contact: Contacts.Contact): string {
    if (contact.name) return contact.name;
    
    const parts = [];
    if (contact.firstName) parts.push(contact.firstName);
    if (contact.lastName) parts.push(contact.lastName);
    
    if (parts.length > 0) return parts.join(' ');
    if (contact.company) return contact.company;
    
    return 'Unknown Contact';
  }

  /**
   * Format phone number for dialing (remove non-digits except +)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Keep only digits and + sign, remove all other characters
    return phoneNumber.replace(/[^\d+]/g, '');
  }

  /**
   * Check if a search result is relevant based on additional criteria
   */
  private isRelevantMatch(query: string, contact: ContactSearchResult, score: number): boolean {
    const queryLower = query.toLowerCase().trim();
    const contactName = contact.name.toLowerCase();
    const firstName = contact.firstName?.toLowerCase() || '';
    const lastName = contact.lastName?.toLowerCase() || '';
    const company = contact.company?.toLowerCase() || '';

    // If score is very good (< 0.1), always include
    if (score < 0.1) return true;

    // Check if query is a substring of any name field (more lenient for partial matches)
    if (contactName.includes(queryLower) ||
        firstName.includes(queryLower) ||
        lastName.includes(queryLower) ||
        company.includes(queryLower)) {
      return true;
    }

    // For multi-word queries, check if each word matches part of the name
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
    if (queryWords.length > 1) {
      // Check if all query words are found in the contact name
      const allWordsMatch = queryWords.every(word => 
        contactName.includes(word) || 
        firstName.includes(word) || 
        lastName.includes(word)
      );
      
      // Also check if the contact name words are found in the query (partial name match)
      const contactNameWords = contactName.split(/\s+/).filter(word => word.length > 0);
      const contactWordsInQuery = contactNameWords.some(word => 
        queryWords.some(queryWord => queryWord.includes(word) || word.includes(queryWord))
      );
      
      if (allWordsMatch || contactWordsInQuery) {
        return true;
      }
    }

    // For scores between 0.1 and 0.3, be more strict
    if (score <= 0.3) {
      // Check if at least 50% of the query characters are present
      const queryChars = queryLower.split('');
      const nameChars = contactName.split('');
      const matchingChars = queryChars.filter(char => nameChars.includes(char));
      const matchRatio = matchingChars.length / queryChars.length;

      return matchRatio >= 0.5;
    }

    // For scores > 0.3, reject (too fuzzy)
    return false;
  }

  /**
   * Initialize Fuse.js for fuzzy searching
   */
  private initializeFuseSearch(): void {
    const fuseOptions = {
      keys: [
        { name: 'name', weight: 0.4 },
        { name: 'firstName', weight: 0.3 },
        { name: 'lastName', weight: 0.3 },
        { name: 'company', weight: 0.2 },
      ],
      threshold: 0.4, // Slightly more lenient to accommodate multi-word searches
      distance: 100, // Increased distance for better matching
      includeScore: true,
      minMatchCharLength: 1, // Reduced to allow shorter matches
      ignoreLocation: false,
      findAllMatches: true, // Find all matches for better multi-word handling
      useExtendedSearch: false,
    };

    this.fuse = new Fuse(this.contactsCache, fuseOptions);
  }

  /**
   * Search contacts by name with fuzzy matching
   */
  async searchContacts(
    query: string,
    options: ContactSearchOptions = {}
  ): Promise<ContactSearchResult[]> {
    const {
      maxResults = 10,
      includeCompanies = true,
      fuzzyThreshold = 0.4, // Slightly more lenient default threshold
    } = options;

    try {
      // Ensure contacts are loaded
      await this.loadContacts();

      if (!this.fuse) {
        throw new Error('Search index not initialized');
      }

      // For multi-word queries, also try matching individual words
      let searchResults = this.fuse.search(query, { limit: maxResults * 3 });
      
      // If we have a multi-word query and few results, try searching for individual words
      const queryWords = query.trim().toLowerCase().split(/\s+/).filter(word => word.length > 0);
      if (queryWords.length > 1 && searchResults.length < 3) {
        // Search for each word separately and combine results
        const wordResults: Array<FuseResult<ContactSearchResult>> = [];
        for (const word of queryWords) {
          const wordSearch = this.fuse.search(word, { limit: maxResults });
          wordResults.push(...wordSearch);
        }
        
        // Combine and deduplicate results
        const combinedResults = new Map<string, FuseResult<ContactSearchResult>>();
        for (const result of [...searchResults, ...wordResults]) {
          if (!combinedResults.has(result.item.id)) {
            combinedResults.set(result.item.id, result);
          }
        }
        
        searchResults = Array.from(combinedResults.values());
      }

      // Transform results and add search scores with additional filtering
      let results = searchResults
        .filter(result => result.score !== undefined && result.score <= fuzzyThreshold)
        .filter(result => this.isRelevantMatch(query, result.item, result.score || 1))
        .map(result => ({
          ...result.item,
          searchScore: result.score,
        }));

      // Sort by search score (best matches first)
      results.sort((a, b) => (a.searchScore || 1) - (b.searchScore || 1));

      // Filter by company inclusion preference
      if (!includeCompanies) {
        results = results.filter(contact => 
          contact.firstName || contact.lastName || !contact.company
        );
      }

      // Limit results
      results = results.slice(0, maxResults);

      console.log(`Found ${results.length} contacts for query: "${query}"`);
      return results;
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw new Error(`Failed to search contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(contactId: string): Promise<ContactSearchResult | null> {
    try {
      await this.loadContacts();
      return this.contactsCache.find(contact => contact.id === contactId) || null;
    } catch (error) {
      console.error('Error getting contact by ID:', error);
      return null;
    }
  }

  /**
   * Get all contacts (cached)
   */
  async getAllContacts(): Promise<ContactSearchResult[]> {
    try {
      return await this.loadContacts();
    } catch (error) {
      console.error('Error getting all contacts:', error);
      return [];
    }
  }

  /**
   * Clear contacts cache
   */
  clearCache(): void {
    this.contactsCache = [];
    this.lastCacheUpdate = null;
    this.fuse = null;
    console.log('Contacts cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { count: number; lastUpdate: Date | null; isValid: boolean } {
    const isValid = this.lastCacheUpdate !== null && 
      (Date.now() - this.lastCacheUpdate.getTime()) < this.CACHE_DURATION;
    
    return {
      count: this.contactsCache.length,
      lastUpdate: this.lastCacheUpdate,
      isValid,
    };
  }
}

// Singleton instance
export const contactCallingService = new ContactCallingService();
export default ContactCallingService;

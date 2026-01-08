import { API_CONFIG } from '@/config/api';
import { supabase, isSupabaseConfigured } from '@/config/supabase';
import { weatherService, WeatherData } from './WeatherService';
import { locationService, LocationData } from './LocationService';
import { contactCallingService, ContactSearchResult } from './ContactCallingService';
import { permissionManager } from './PermissionManager';
import { intentService, IntentDetectionResult } from './IntentService';
import { webSearchService } from '@/services/WebSearchService';

export interface AIResponse {
  text: string;
  model: string;
  timestamp: Date;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

export class AIResponseService {
  private conversationHistory: ConversationContext = { messages: [] };
  private readonly maxHistoryLength = 10; // Keep last 10 messages for context

  constructor() {
    // Initialize with a system message to set the assistant's personality
    this.conversationHistory.messages.push({
      role: 'assistant',
      content: 'I am a helpful voice assistant. I will provide clear, concise, and friendly responses to your questions.',
      timestamp: new Date(),
    });
  }

  /**
   * Check if a message is asking about weather
   */
  private isWeatherQuery(message: string): boolean {
    const weatherKeywords = [
      'weather', 'temperature', 'forecast', 'rain', 'sunny', 'cloudy', 'storm',
      'hot', 'cold', 'warm', 'cool', 'humidity', 'wind', 'snow', 'precipitation',
      'climate', 'degrees', 'celsius', 'fahrenheit'
    ];

    const lowerMessage = message.toLowerCase();
    return weatherKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Check if a message is asking about date or time
   */
  private isDateTimeQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // First check if this is a weather query - weather takes priority
    if (this.isWeatherQuery(message)) {
      return false;
    }

    // More specific date/time patterns to avoid false positives
    const specificDateTimePatterns = [
      /what\s+(time|date)\s+is\s+it/i,
      /what\s+is\s+the\s+(time|date)/i,
      /current\s+(time|date)/i,
      /tell\s+me\s+the\s+(time|date)/i,
      /what\s+day\s+is\s+it/i,
      /what\s+time\s+zone/i,
      /time\s+in\s+[a-zA-Z\s,]+(?:\?|$)/i, // "time in London"
    ];

    // Check for specific patterns first
    const hasSpecificPattern = specificDateTimePatterns.some(pattern =>
      pattern.test(lowerMessage)
    );

    if (hasSpecificPattern) {
      return true;
    }

    // Only check for standalone time keywords if no weather context
    const standaloneTimeKeywords = [
      'clock', 'hour', 'minute', 'second', 'timezone', 'zone'
    ];

    // Check if message is primarily about time (not weather with time context)
    const hasStandaloneTimeKeyword = standaloneTimeKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    // Additional check: if message contains "time" but also location without weather context
    const timeWithLocationPattern = /(?:time|date).*(?:in|at|for)\s+[a-zA-Z\s,]+/i;
    const hasTimeWithLocation = timeWithLocationPattern.test(lowerMessage) &&
      !this.isWeatherQuery(message);

    return hasStandaloneTimeKeyword || hasTimeWithLocation;
  }

  /**
   * Extract location from weather query
   */
  private extractLocationFromQuery(message: string): string | null {
    const lowerMessage = message.toLowerCase();

    // Common patterns for location in weather queries
    const locationPatterns = [
      /(?:weather|forecast|temperature).*?(?:in|for|at)\s+([a-zA-Z\s,]+?)(?:\?|$|\.)/i,
      /(?:in|for|at)\s+([a-zA-Z\s,]+?)(?:\s+weather|\s+forecast|\s+temperature|\?|$|\.)/i,
      /([a-zA-Z\s,]+?)(?:\s+weather|\s+forecast|\s+temperature)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Filter out common non-location words
        const excludeWords = ['the', 'today', 'tomorrow', 'now', 'current', 'like', 'what', 'how', 'is'];
        const cleanLocation = location.split(' ')
          .filter(word => !excludeWords.includes(word.toLowerCase()))
          .join(' ')
          .trim();

        if (cleanLocation.length > 1) {
          return cleanLocation;
        }
      }
    }

    return null;
  }

  /**
   * Extract timezone/location from date/time query
   */
  private extractTimezoneFromQuery(message: string): string | null {
    // More specific patterns for location/timezone in date/time queries
    const timezonePatterns = [
      // "time in Lahore", "date in Pakistan" - stop at common time words
      /(?:time|date|day).*?(?:in|at)\s+([a-zA-Z\s,]+?)(?:\s+today|\s+now|\s+right|\s+currently|\?|$|\.)/i,
      // "in Lahore time", "at Pakistan date" - stop at common time words
      /(?:in|at)\s+([a-zA-Z\s,]+?)(?:\s+time|\s+date|\s+today|\s+now|\s+right|\s+currently|\?|$|\.)/i,
    ];

    for (const pattern of timezonePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();

        // Filter out common non-location words more aggressively
        const excludeWords = [
          'the', 'today', 'tomorrow', 'now', 'current', 'like', 'what', 'how', 'is',
          'tell', 'me', 'recent', 'day', 'time', 'date', 'it', 'this', 'that',
          'right', 'currently', 'please', 'can', 'you', 'just', 'exactly'
        ];

        const cleanLocation = location.split(' ')
          .filter(word => !excludeWords.includes(word.toLowerCase()))
          .join(' ')
          .trim();

        // Only return if we have a meaningful location (at least 3 characters and not just common words)
        if (cleanLocation.length >= 3 && !excludeWords.includes(cleanLocation.toLowerCase())) {
          return cleanLocation;
        }
      }
    }

    return null;
  }

  /**
   * Get timezone for any location in the world
   */
  private getTimezoneForLocation(location: string): string | null {
    const lowerLocation = location.toLowerCase().trim();

    // Comprehensive timezone database
    const timezoneDatabase: { [key: string]: string } = {
      // === ASIA ===
      // Pakistan
      'lahore': 'Asia/Karachi', 'pakistan': 'Asia/Karachi', 'karachi': 'Asia/Karachi',
      'islamabad': 'Asia/Karachi', 'rawalpindi': 'Asia/Karachi', 'faisalabad': 'Asia/Karachi',
      'peshawar': 'Asia/Karachi', 'quetta': 'Asia/Karachi', 'multan': 'Asia/Karachi',

      // India
      'mumbai': 'Asia/Kolkata', 'delhi': 'Asia/Kolkata', 'bangalore': 'Asia/Kolkata',
      'chennai': 'Asia/Kolkata', 'kolkata': 'Asia/Kolkata', 'hyderabad': 'Asia/Kolkata',
      'pune': 'Asia/Kolkata', 'ahmedabad': 'Asia/Kolkata', 'india': 'Asia/Kolkata',
      'new delhi': 'Asia/Kolkata', 'calcutta': 'Asia/Kolkata',

      // China
      'beijing': 'Asia/Shanghai', 'shanghai': 'Asia/Shanghai', 'guangzhou': 'Asia/Shanghai',
      'shenzhen': 'Asia/Shanghai', 'chengdu': 'Asia/Shanghai', 'china': 'Asia/Shanghai',
      'hong kong': 'Asia/Hong_Kong', 'hongkong': 'Asia/Hong_Kong',

      // Japan
      'tokyo': 'Asia/Tokyo', 'osaka': 'Asia/Tokyo', 'kyoto': 'Asia/Tokyo',
      'yokohama': 'Asia/Tokyo', 'japan': 'Asia/Tokyo',

      // Middle East
      'dubai': 'Asia/Dubai', 'abu dhabi': 'Asia/Dubai', 'uae': 'Asia/Dubai',
      'united arab emirates': 'Asia/Dubai', 'riyadh': 'Asia/Riyadh',
      'saudi arabia': 'Asia/Riyadh', 'kuwait': 'Asia/Kuwait',
      'doha': 'Asia/Qatar', 'qatar': 'Asia/Qatar',
      'tehran': 'Asia/Tehran', 'iran': 'Asia/Tehran',
      'baghdad': 'Asia/Baghdad', 'iraq': 'Asia/Baghdad',
      'istanbul': 'Europe/Istanbul', 'ankara': 'Europe/Istanbul', 'turkey': 'Europe/Istanbul',

      // Southeast Asia
      'singapore': 'Asia/Singapore', 'kuala lumpur': 'Asia/Kuala_Lumpur',
      'malaysia': 'Asia/Kuala_Lumpur', 'bangkok': 'Asia/Bangkok', 'thailand': 'Asia/Bangkok',
      'jakarta': 'Asia/Jakarta', 'indonesia': 'Asia/Jakarta',
      'manila': 'Asia/Manila', 'philippines': 'Asia/Manila',
      'ho chi minh': 'Asia/Ho_Chi_Minh', 'vietnam': 'Asia/Ho_Chi_Minh',

      // === EUROPE ===
      // UK & Ireland
      'london': 'Europe/London', 'manchester': 'Europe/London', 'birmingham': 'Europe/London',
      'liverpool': 'Europe/London', 'edinburgh': 'Europe/London', 'glasgow': 'Europe/London',
      'uk': 'Europe/London', 'united kingdom': 'Europe/London', 'england': 'Europe/London',
      'scotland': 'Europe/London', 'wales': 'Europe/London', 'britain': 'Europe/London',
      'dublin': 'Europe/Dublin', 'ireland': 'Europe/Dublin',

      // Western Europe
      'paris': 'Europe/Paris', 'marseille': 'Europe/Paris', 'lyon': 'Europe/Paris',
      'france': 'Europe/Paris', 'berlin': 'Europe/Berlin', 'munich': 'Europe/Berlin',
      'hamburg': 'Europe/Berlin', 'germany': 'Europe/Berlin', 'amsterdam': 'Europe/Amsterdam',
      'rotterdam': 'Europe/Amsterdam', 'netherlands': 'Europe/Amsterdam', 'holland': 'Europe/Amsterdam',
      'brussels': 'Europe/Brussels', 'belgium': 'Europe/Brussels',

      // Southern Europe
      'rome': 'Europe/Rome', 'milan': 'Europe/Rome', 'naples': 'Europe/Rome',
      'italy': 'Europe/Rome', 'madrid': 'Europe/Madrid', 'barcelona': 'Europe/Madrid',
      'spain': 'Europe/Madrid', 'lisbon': 'Europe/Lisbon', 'portugal': 'Europe/Lisbon',
      'athens': 'Europe/Athens', 'greece': 'Europe/Athens',

      // Northern Europe
      'stockholm': 'Europe/Stockholm', 'sweden': 'Europe/Stockholm',
      'oslo': 'Europe/Oslo', 'norway': 'Europe/Oslo',
      'copenhagen': 'Europe/Copenhagen', 'denmark': 'Europe/Copenhagen',
      'helsinki': 'Europe/Helsinki', 'finland': 'Europe/Helsinki',

      // Eastern Europe
      'moscow': 'Europe/Moscow', 'st petersburg': 'Europe/Moscow', 'russia': 'Europe/Moscow',
      'warsaw': 'Europe/Warsaw', 'poland': 'Europe/Warsaw',
      'prague': 'Europe/Prague', 'czech republic': 'Europe/Prague',
      'budapest': 'Europe/Budapest', 'hungary': 'Europe/Budapest',
      'vienna': 'Europe/Vienna', 'austria': 'Europe/Vienna',
      'zurich': 'Europe/Zurich', 'geneva': 'Europe/Zurich', 'switzerland': 'Europe/Zurich',

      // === AMERICAS ===
      // USA - Eastern Time
      'new york': 'America/New_York', 'nyc': 'America/New_York', 'new york city': 'America/New_York',
      'boston': 'America/New_York', 'philadelphia': 'America/New_York', 'washington': 'America/New_York',
      'miami': 'America/New_York', 'atlanta': 'America/New_York', 'detroit': 'America/New_York',

      // USA - Central Time
      'chicago': 'America/Chicago', 'dallas': 'America/Chicago', 'houston': 'America/Chicago',
      'new orleans': 'America/Chicago', 'minneapolis': 'America/Chicago',

      // USA - Mountain Time
      'denver': 'America/Denver', 'phoenix': 'America/Phoenix', 'salt lake city': 'America/Denver',

      // USA - Pacific Time
      'los angeles': 'America/Los_Angeles', 'la': 'America/Los_Angeles', 'san francisco': 'America/Los_Angeles',
      'seattle': 'America/Los_Angeles', 'portland': 'America/Los_Angeles', 'san diego': 'America/Los_Angeles',
      'las vegas': 'America/Los_Angeles',

      // USA - General
      'usa': 'America/New_York', 'united states': 'America/New_York', 'america': 'America/New_York',

      // Canada
      'toronto': 'America/Toronto', 'montreal': 'America/Toronto', 'ottawa': 'America/Toronto',
      'vancouver': 'America/Vancouver', 'calgary': 'America/Edmonton', 'edmonton': 'America/Edmonton',
      'canada': 'America/Toronto',

      // Mexico & Central America
      'mexico city': 'America/Mexico_City', 'guadalajara': 'America/Mexico_City', 'mexico': 'America/Mexico_City',
      'guatemala': 'America/Guatemala', 'costa rica': 'America/Costa_Rica',

      // South America
      'sao paulo': 'America/Sao_Paulo', 'rio de janeiro': 'America/Sao_Paulo', 'brazil': 'America/Sao_Paulo',
      'buenos aires': 'America/Argentina/Buenos_Aires', 'argentina': 'America/Argentina/Buenos_Aires',
      'santiago': 'America/Santiago', 'chile': 'America/Santiago',
      'bogota': 'America/Bogota', 'colombia': 'America/Bogota',
      'lima': 'America/Lima', 'peru': 'America/Lima',
      'caracas': 'America/Caracas', 'venezuela': 'America/Caracas',

      // === AFRICA ===
      'cairo': 'Africa/Cairo', 'egypt': 'Africa/Cairo', 'alexandria': 'Africa/Cairo',
      'johannesburg': 'Africa/Johannesburg', 'cape town': 'Africa/Johannesburg', 'durban': 'Africa/Johannesburg',
      'south africa': 'Africa/Johannesburg', 'lagos': 'Africa/Lagos', 'abuja': 'Africa/Lagos',
      'nigeria': 'Africa/Lagos', 'nairobi': 'Africa/Nairobi', 'kenya': 'Africa/Nairobi',
      'casablanca': 'Africa/Casablanca', 'morocco': 'Africa/Casablanca',
      'tunis': 'Africa/Tunis', 'tunisia': 'Africa/Tunis',
      'algiers': 'Africa/Algiers', 'algeria': 'Africa/Algiers',
      'addis ababa': 'Africa/Addis_Ababa', 'ethiopia': 'Africa/Addis_Ababa',
      'accra': 'Africa/Accra', 'ghana': 'Africa/Accra',
      'dakar': 'Africa/Dakar', 'senegal': 'Africa/Dakar',

      // === OCEANIA ===
      'sydney': 'Australia/Sydney', 'melbourne': 'Australia/Melbourne', 'brisbane': 'Australia/Brisbane',
      'perth': 'Australia/Perth', 'adelaide': 'Australia/Adelaide', 'australia': 'Australia/Sydney',
      'auckland': 'Pacific/Auckland', 'wellington': 'Pacific/Auckland', 'new zealand': 'Pacific/Auckland',
      'fiji': 'Pacific/Fiji', 'samoa': 'Pacific/Apia',

      // === CONTINENT DEFAULTS ===
      'africa': 'Africa/Cairo', 'europe': 'Europe/London', 'asia': 'Asia/Karachi',
      'north america': 'America/New_York', 'south america': 'America/Sao_Paulo',
      'oceania': 'Australia/Sydney',
    };

    // First try exact match
    if (timezoneDatabase[lowerLocation]) {
      return timezoneDatabase[lowerLocation];
    }

    // Try partial matching for compound names
    for (const [key, timezone] of Object.entries(timezoneDatabase)) {
      if (lowerLocation.includes(key) || key.includes(lowerLocation)) {
        return timezone;
      }
    }

    // Try common timezone patterns as fallback
    const fallbackPatterns = [
      // Try common timezone formats
      `Asia/${this.capitalizeWords(location)}`,
      `Europe/${this.capitalizeWords(location)}`,
      `America/${this.capitalizeWords(location)}`,
      `Africa/${this.capitalizeWords(location)}`,
      `Pacific/${this.capitalizeWords(location)}`,
      `Australia/${this.capitalizeWords(location)}`,
    ];

    for (const pattern of fallbackPatterns) {
      if (this.isValidTimezone(pattern)) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Capitalize words for timezone format
   */
  private capitalizeWords(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('_');
  }

  /**
   * Check if a timezone is valid
   */
  private isValidTimezone(timezone: string): boolean {
    try {
      // Try to create a date with the timezone to validate it
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Enforce English-only response. If the model produced non-English text or the user asked
   * to respond in another language, return a short English policy message instead.
   */
  private enforceEnglishResponse(userMessage: string, modelText: string): string {
    const details = this.detectUserLanguageRequest(userMessage);
    const nonEnglishOut = this.containsNonEnglishScript(modelText);

    if (details.requested) {
      const actionText = details.actionText || 'proceed';
      return `I can understand many languages, but I currently respond only in English. Would you like me to ${actionText} in English instead?`;
    }

    if (nonEnglishOut) {
      // Model produced non-English despite instructions; offer to complete in English based on inferred action
      const inferred = this.extractRequestedAction(userMessage);
      const actionText = inferred.actionText || 'proceed';
      return `I'm currently set to reply only in English. Would you like me to ${actionText} in English?`;
    }

    return modelText;
  }

  /**
   * Heuristically detect whether user asked to reply/speak in some other language.
   */
  private detectUserLanguageRequest(message: string): { requested: boolean; language?: string; action?: string; actionText?: string } {
    const text = (message || '').toLowerCase();
    const keywords = [
      'reply in', 'respond in', 'answer in', 'speak in', 'talk in', 'say in', 'use', 'in language',
    ];
    const languages = [
      'hindi', 'urdu', 'punjabi', 'arabic', 'spanish', 'french', 'german', 'chinese', 'japanese', 'korean',
      'italian', 'portuguese', 'russian', 'turkish', 'bengali', 'tamil', 'telugu', 'marathi', 'gujarati',
      'thai', 'indonesian', 'vietnamese', 'malay', 'persian', 'farsi', 'hebrew'
    ];

    const simpleInLangMatch = /\b(?:in|into)\s+([a-z]+)/i.exec(text);
    const language = simpleInLangMatch && languages.includes(simpleInLangMatch[1].toLowerCase())
      ? simpleInLangMatch[1].toLowerCase()
      : (languages.find(l => text.includes(l)) || undefined);

    const requested = !!language && (keywords.some(k => text.includes(k)) || /\bwrite\b|\bspeak\b|\btalk\b|\btranslate\b/i.test(text));
    const actionInfo = this.extractRequestedAction(text);
    return { requested, language, action: actionInfo.action, actionText: actionInfo.actionText };
  }

  /**
   * Extract the requested action from the user's message (e.g., write a story, translate, summarize).
   */
  private extractRequestedAction(message: string): { action: string; actionText: string } {
    const text = (message || '').toLowerCase();
    const has = (w: string | RegExp) => (typeof w === 'string' ? text.includes(w) : w.test(text));

    if (has(/write/)) {
      if (has('story')) return { action: 'write_story', actionText: 'write the story' };
      if (has('poem')) return { action: 'write_poem', actionText: 'write the poem' };
      if (has('email')) return { action: 'write_email', actionText: 'write the email' };
      return { action: 'write', actionText: 'write it' };
    }
    if (has(/translate/)) return { action: 'translate', actionText: 'translate it' };
    if (has(/summarize|summary/)) return { action: 'summarize', actionText: 'summarize it' };
    if (has(/explain|explanation/)) return { action: 'explain', actionText: 'explain it' };
    if (has(/joke/)) return { action: 'tell_joke', actionText: 'tell a joke' };
    if (has(/speak|talk|say/)) return { action: 'speak', actionText: 'say it' };
    if (has(/answer|question|help/)) return { action: 'answer', actionText: 'answer your question' };
    return { action: 'respond', actionText: 'proceed' };
  }

  /**
   * Detect if the text contains characters from common non-English scripts.
   * This is a heuristic and not a strict language detector.
   */
  private containsNonEnglishScript(text: string): boolean {
    if (!text) return false;
    // Common non-Latin scripts
    const patterns = [
      /[\u0400-\u04FF]/u, // Cyrillic
      /[\u0590-\u05FF]/u, // Hebrew
      /[\u0600-\u06FF]/u, // Arabic
      /[\u0750-\u077F]/u, // Arabic Supplement
      /[\u08A0-\u08FF]/u, // Arabic Extended
      /[\u0900-\u097F]/u, // Devanagari (Hindi)
      /[\u0980-\u09FF]/u, // Bengali
      /[\u0A80-\u0AFF]/u, // Gujarati
      /[\u0B80-\u0BFF]/u, // Tamil
      /[\u0C00-\u0C7F]/u, // Telugu
      /[\u0E00-\u0E7F]/u, // Thai
      /[\u3040-\u30FF]/u, // Hiragana/Katakana (Japanese)
      /[\u3130-\u318F\uAC00-\uD7AF]/u, // Hangul (Korean)
      /[\u4E00-\u9FFF]/u, // CJK Unified Ideographs (Chinese)
    ];
    return patterns.some(re => re.test(text));
  }

  /**
   * Get current date and time information
   */
  private getCurrentDateTimeInfo(timezone?: string): string {
    const now = new Date();

    // Default to local time if no timezone specified
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    };

    // If timezone/location is specified, try to format for that timezone
    if (timezone) {
      try {
        // Get timezone using comprehensive mapping
        const mappedTimezone = this.getTimezoneForLocation(timezone);

        if (mappedTimezone) {
          options.timeZone = mappedTimezone;
          return now.toLocaleString('en-US', options);
        }
      } catch (error) {
        console.warn('Failed to format time for timezone:', timezone, error);
      }
    }

    return now.toLocaleString('en-US', options);
  }

  /**
   * Handle date/time-specific queries
   */
  private async handleDateTimeQuery(
    userMessage: string,
    intentResult?: IntentDetectionResult
  ): Promise<AIResponse> {
    // Helper to format based on granularity
    const formatForMode = (date: Date, timeZone?: string, mode: 'datetime' | 'date' | 'time' | 'day' = 'datetime'): string => {
      if (mode === 'day') {
        const opts: Intl.DateTimeFormatOptions = { weekday: 'long', timeZone: timeZone };
        return date.toLocaleString('en-US', opts);
      }
      if (mode === 'date') {
        const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', timeZone: timeZone };
        return date.toLocaleString('en-US', opts);
      }
      if (mode === 'time') {
        const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short', timeZone: timeZone };
        return date.toLocaleString('en-US', opts);
      }
      // datetime
      const opts: Intl.DateTimeFormatOptions = {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
        timeZone: timeZone
      };
      return date.toLocaleString('en-US', opts);
    };

    const now = new Date();
    // Use only classifier-provided location. If absent, we will use device location.
    const extractedTimezone = intentResult?.entities?.location;

    // Determine mode from intent entities
    const mode: 'datetime' | 'date' | 'time' | 'day' = intentResult?.entities?.timeOnly
      ? 'time'
      : intentResult?.entities?.dateOnly
        ? 'date'
        : intentResult?.entities?.dayOnly
          ? 'day'
          : 'datetime';

    if (extractedTimezone) {
      const mappedTimezone = this.getTimezoneForLocation(extractedTimezone);
      if (mappedTimezone) {
        const formatted = formatForMode(now, mappedTimezone, mode);
        const label = mode === 'time' ? 'time' : mode === 'date' ? 'date' : mode === 'day' ? 'day' : 'date and time';
        return {
          text: `The current ${label} in ${extractedTimezone} is ${formatted}.`,
          model: 'datetime-service',
          timestamp: new Date(),
        };
      }
      return {
        text: `I'm sorry, I couldn't find timezone information for "${extractedTimezone}". Could you please specify a major city or country? For example, you can ask for time in London, New York, or Tokyo.`,
        model: 'datetime-service',
        timestamp: new Date(),
      };
    }

    // No explicit location: try current device location
    try {
      const currentLocation = await locationService.getCurrentLocation();
      const cityOrCountry = currentLocation.address?.city || currentLocation.address?.country;
      const mappedTimezone = cityOrCountry ? this.getTimezoneForLocation(cityOrCountry) : null;
      const formatted = formatForMode(now, mappedTimezone || undefined, mode);
      const label = mode === 'time' ? 'time' : mode === 'date' ? 'date' : mode === 'day' ? 'day' : 'date and time';

      if (cityOrCountry) {
        return {
          text: `The current ${label} at your location (${currentLocation.address?.formattedAddress || cityOrCountry}) is ${formatted}.`,
          model: 'datetime-service',
          timestamp: new Date(),
        };
      }

      return {
        text: `The current ${label} at your location is ${formatted}.`,
        model: 'datetime-service',
        timestamp: new Date(),
      };
    } catch (err) {
      // Fallback to device local time without location
      const formatted = formatForMode(now, undefined, mode);
      const label = mode === 'time' ? 'time' : mode === 'date' ? 'date' : mode === 'day' ? 'day' : 'date and time';
      return {
        text: `The current ${label} is ${formatted}.`,
        model: 'datetime-service',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Parse temporal modifiers in weather queries: today, tomorrow, yesterday, weekdays, or explicit dates.
   */
  private parseWeatherTemporalRequest(userMessage: string): {
    when: 'current' | 'today' | 'tomorrow' | 'yesterday' | 'date';
    date?: string; // YYYY-MM-DD
    label?: string;
  } {
    const text = userMessage.toLowerCase();

    // Direct keywords
    if (/\byesterday\b/.test(text)) return { when: 'yesterday' };
    if (/\btoday'?s?\b|\bfor\s+today\b/.test(text)) return { when: 'today' };
    if (/\btomorrow'?s?\b|\btmr\b|\bfor\s+tomorrow\b/.test(text)) return { when: 'tomorrow' };

    // Weekday handling (next occurrence including today)
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < weekdays.length; i++) {
      const w = weekdays[i];
      const re = new RegExp(`\\b${w}\\b`, 'i');
      if (re.test(userMessage)) {
        const now = new Date();
        const todayIdx = now.getDay();
        let delta = i - todayIdx;
        if (delta < 0) delta += 7; // upcoming occurrence
        const target = new Date(now);
        target.setHours(0, 0, 0, 0);
        target.setDate(now.getDate() + delta);
        const yyyy = target.getFullYear();
        const mm = String(target.getMonth() + 1).padStart(2, '0');
        const dd = String(target.getDate()).padStart(2, '0');
        const label = w.charAt(0).toUpperCase() + w.slice(1);
        return { when: delta === 0 ? 'today' : 'date', date: `${yyyy}-${mm}-${dd}`, label };
      }
    }

    // Explicit date: YYYY-MM-DD
    let m = userMessage.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (m) {
      const [_, y, mo, d] = m;
      const iso = `${y}-${mo}-${d}`;
      return { when: 'date', date: iso, label: iso };
    }

    // Explicit date: DD/MM/YYYY or DD-MM-YYYY
    m = userMessage.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
    if (m) {
      const dd = String(parseInt(m[1], 10)).padStart(2, '0');
      const mm = String(parseInt(m[2], 10)).padStart(2, '0');
      const yyyy = m[3];
      const iso = `${yyyy}-${mm}-${dd}`;
      return { when: 'date', date: iso, label: iso };
    }

    // Explicit month name, e.g., "12 September" or "September 12"
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    // "12 September" pattern
    m = userMessage.match(/\b(\d{1,2})\s+([a-zA-Z]+)\b/);
    if (m) {
      const dd = String(parseInt(m[1], 10));
      const monIdx = months.indexOf(m[2].toLowerCase());
      if (monIdx >= 0) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const target = new Date(yyyy, monIdx, parseInt(dd, 10));
        const iso = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
        const label = `${months[monIdx].charAt(0).toUpperCase() + months[monIdx].slice(1)} ${dd}`;
        // If the date already passed this year, keep it as is; forecast may simply be unavailable and code will handle it.
        return { when: 'date', date: iso, label };
      }
    }
    // "September 12" pattern
    m = userMessage.match(/\b([a-zA-Z]+)\s+(\d{1,2})\b/);
    if (m) {
      const monIdx = months.indexOf(m[1].toLowerCase());
      const dd = String(parseInt(m[2], 10));
      if (monIdx >= 0) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const target = new Date(yyyy, monIdx, parseInt(dd, 10));
        const iso = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
        const label = `${months[monIdx].charAt(0).toUpperCase() + months[monIdx].slice(1)} ${dd}`;
        return { when: 'date', date: iso, label };
      }
    }

    return { when: 'current' };
  }

  /**
   * Handle weather-specific queries
   */
  private async handleWeatherQuery(userMessage: string, intentResult?: IntentDetectionResult): Promise<AIResponse | null> {
    try {
      if (!weatherService.isConfigured()) {
        return {
          text: "I'd love to help you with weather information, but the weather service isn't configured yet. Please ask the developer to set up the OpenWeatherMap API key.",
          model: 'weather-service',
          timestamp: new Date(),
        };
      }

      // Use only classifier-provided location. If absent, use device location below.
      const extractedLocation = intentResult?.entities?.location;
      let weatherData: WeatherData;

      if (extractedLocation) {
        // User specified a location
        console.log('Getting weather for specified location:', extractedLocation);
        weatherData = await weatherService.getWeatherByCity(extractedLocation);
      } else {
        // No location specified, try to get current location
        console.log('No location specified, trying to get current location');
        try {
          const currentLocation = await locationService.getCurrentLocation();
          weatherData = await weatherService.getWeatherByCoordinates(
            currentLocation.latitude,
            currentLocation.longitude,
            currentLocation.address?.city,
            currentLocation.address?.country
          );
        } catch (locationError) {
          console.warn('Failed to get current location:', locationError);
          return {
            text: "I can help you with weather information! Could you please tell me which city or location you'd like to know the weather for?",
            model: 'weather-service',
            timestamp: new Date(),
          };
        }
      }

      // Generate a natural weather response for requested temporal scope
      const whenOpts = this.parseWeatherTemporalRequest(userMessage);
      const weatherSummary = weatherService.generateWeatherSummary(weatherData, whenOpts);

      return {
        text: weatherSummary,
        model: 'weather-service',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Weather query error:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('Location')) {
          return {
            text: `I couldn't find weather information for that location. Could you please check the spelling or try a different city name?`,
            model: 'weather-service',
            timestamp: new Date(),
          };
        } else if (error.message.includes('permission')) {
          return {
            text: `I need location permission to get weather for your current location. You can either enable location access in your settings or tell me which city you'd like weather information for.`,
            model: 'weather-service',
            timestamp: new Date(),
          };
        }
      }

      // Return null to fall back to regular AI response
      return null;
    }
  }

  /**
   * Check if the message is a call command
   */
  private isCallCommand(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();

    const callPatterns = [
      /\b(call|phone|dial|ring)\s+/i,
      /\bmake\s+a\s+(call|phone)\s+to\s+/i,
      /\bplace\s+a\s+(call|phone)\s+to\s+/i,
      /\bget\s+in\s+touch\s+with\s+/i,
      /\bcontact\s+/i,
      /\bphone\s+number\s+for\s+/i,
    ];

    return callPatterns.some(pattern => pattern.test(lowerMessage));
  }

  /**
   * Extract contact name from call command
   */
  private extractContactName(message: string): string | null {
    const lowerMessage = message.toLowerCase().trim();

    // Patterns to extract contact name
    const namePatterns = [
      /\b(?:call|phone|dial|ring)\s+(.+?)(?:\s+(?:please|now|right\s+now))?$/i,
      /\bmake\s+a\s+(?:call|phone)\s+to\s+(.+?)(?:\s+(?:please|now|right\s+now))?$/i,
      /\bplace\s+a\s+(?:call|phone)\s+to\s+(.+?)(?:\s+(?:please|now|right\s+now))?$/i,
      /\bget\s+in\s+touch\s+with\s+(.+?)(?:\s+(?:please|now|right\s+now))?$/i,
      /\bcontact\s+(.+?)(?:\s+(?:please|now|right\s+now))?$/i,
      /\bphone\s+number\s+for\s+(.+?)(?:\s+(?:please|now|right\s+now))?$/i,
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        // Clean up the extracted name
        let contactName = match[1].trim();

        // Remove common words that might be captured
        contactName = contactName.replace(/\b(please|now|right\s+now|immediately|asap)\b/gi, '').trim();

        // Handle special case where the name might include trailing punctuation or "on mobile"
        contactName = contactName.replace(/\s+(on\s+mobile|on\s+cell|at\s+home|at\s+work)$/i, '').trim();

        // Remove trailing punctuation
        contactName = contactName.replace(/[.!?]+$/, '').trim();

        // Heuristic: ensure this looks like a person name, not a sentence
        const looksLikePersonName = (() => {
          if (!contactName) return false;
          if (/[\?\.!]/.test(contactName)) return false;
          const disallowedTokens = [
            'should', 'would', 'could', 'can', 'ask', 'for', 'a', 'treat', 'buy', 'new', 'phone', 'latest', 'model',
            'weather', 'time', 'date', 'today', 'now', 'current', 'camera', 'battery', 'storage', 'of', 'the', 'so',
            // Health/advice and general help terms should never be treated as names
            'feeling', 'feelings', 'depression', 'anxiety', 'therapy', 'therapist', 'psychological',
            'recommend', 'help', 'cope', 'coping', 'sleep', 'sleeping', 'insomnia', 'motivation', 'sadness',
            'withdraw', 'withdrawal', 'issue', 'problem', 'with', 'this', 'these', 'that'
          ];
          const tokens = contactName.toLowerCase().split(/\s+/).filter(Boolean);
          const disallowedCount = tokens.filter(t => disallowedTokens.includes(t)).length;
          if (tokens.length > 4 || disallowedCount >= 1) return false;
          return true;
        })();

        if (contactName.length > 0 && looksLikePersonName) {
          return contactName;
        }
      }
    }

    return null;
  }

  /**
   * Handle call-specific queries
   */
  private async handleCallCommand(userMessage: string, intentResult?: IntentDetectionResult): Promise<AIResponse | null> {
    try {
      // Check permissions first using the new permission system
      const permissionStatus = await permissionManager.checkPermission('contacts');
      if (!permissionStatus.granted) {
        // Return a special response that will trigger the permission request
        return {
          text: 'CONTACTS_PERMISSION_REQUIRED',
          model: 'call-service',
          timestamp: new Date(),
        };
      }

      // Use only classifier/heuristics-provided contact name. If absent, ask the user.
      const contactName = intentResult?.entities?.contactName || null;
      if (!contactName) {
        return {
          text: "I'd be happy to help you make a call! Could you please tell me who you'd like to call?",
          model: 'call-service',
          timestamp: new Date(),
        };
      }

      console.log(`Searching for contact: "${contactName}"`);

      // Search for contacts
      const searchResults = await contactCallingService.searchContacts(contactName, {
        maxResults: 5,
        includeCompanies: true,
      });

      if (searchResults.length === 0) {
        return {
          text: `I couldn't find any contacts matching "${contactName}". Could you check the spelling or try a different name?`,
          model: 'call-service',
          timestamp: new Date(),
        };
      }

      // Return a special response that will trigger the contact picker
      return {
        text: `CALL_CONTACTS_FOUND:${JSON.stringify({
          query: contactName,
          contacts: searchResults,
          count: searchResults.length,
        })}`,
        model: 'call-service',
        timestamp: new Date(),
      };

    } catch (error) {
      console.error('Call command error:', error);

      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          // Return the special permission required response to trigger the permission modal
          return {
            text: 'CONTACTS_PERMISSION_REQUIRED',
            model: 'call-service',
            timestamp: new Date(),
          };
        }
      }

      return {
        text: "I'm having trouble accessing your contacts right now. Please try again in a moment.",
        model: 'call-service',
        timestamp: new Date(),
      };
    }
  }

  /**
   * LLM-backed intent classifier (Gemini) used as a fallback when heuristics are uncertain.
   * This requests a strictly-JSON response describing the intent and entities.
   */
  private async classifyIntentWithLLM(userMessage: string): Promise<IntentDetectionResult | null> {
    try {
      const instruction = `You are an intent classifier for a voice assistant. Classify the user's message into one of these intents:
- datetime (questions about current time, date, day, or time in a location)
- weather (questions about weather/forecast/temperature, possibly with a location)
- call (requests to call/dial/contact a person)
- realtime (current office holders or latest device models)
- general (everything else)

Return ONLY compact JSON (no text before or after). Schema:
{
  "intent": "datetime" | "weather" | "call" | "realtime" | "general",
  "confidence": number,
  "entities": {
    "location"?: string,
    "contactName"?: string,
    "dateOnly"?: boolean,
    "timeOnly"?: boolean,
    "dayOnly"?: boolean
  },
  "needsClarification": boolean,
  "clarificationQuestion"?: string
}

Normalization requirements:
- For entities.location, return ONLY a clean city or country name (e.g., "Lahore", "Pakistan", "London").
  Do NOT include words like "right", "now", "today", "current", "please", "the", or any trailing words from the sentence.
  Examples: "weather in Lahore right now" -> location: "Lahore". "time in New York right now" -> location: "New York".
- If no location is provided for weather or datetime, leave entities.location undefined (the app will use current device location).
- For entities.contactName, return ONLY the person's name (e.g., "Ahmed", "Sara Khan"). Remove words like "call", "dial", "please", "now", "right now" and any punctuation.
- Never invent locations or contact names.

Rules:
- If the message clearly asks for time/date (e.g., "what time is it", "time in London"), choose datetime. Use dateOnly/timeOnly/dayOnly flags accordingly.
- If it clearly asks about weather/temperature/forecast, choose weather and include a location if present.
- If it clearly commands to call/dial/contact someone, choose call and include contactName if present.
- If it asks for the latest iPhone model or who is the president/prime minister of a country, choose realtime.
- Otherwise choose general.
- Be conservative with confidence and clarification: use needsClarification only when the user intent is truly unclear (e.g., just "time" without context).`;

      const requestBody: any = {
        contents: [
          {
            parts: [
              { text: instruction },
              { text: `User message: ${userMessage}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 20,
          topP: 0.9,
          maxOutputTokens: 256,
          response_mime_type: 'application/json',
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      };

      const data = await this.invokeGeminiProxy(requestBody).catch(() => null);
      if (!data) return null;
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!raw) return null;

      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { }
        }
      }

      if (!parsed || typeof parsed !== 'object' || !parsed.intent) return null;

      const result: IntentDetectionResult = {
        intent: parsed.intent,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.0,
        entities: {
          location: typeof parsed.entities?.location === 'string' ? parsed.entities.location : undefined,
          contactName: typeof parsed.entities?.contactName === 'string' ? parsed.entities.contactName : undefined,
          dateOnly: !!parsed.entities?.dateOnly,
          timeOnly: !!parsed.entities?.timeOnly,
          dayOnly: !!parsed.entities?.dayOnly,
        },
        needsClarification: !!parsed.needsClarification,
        clarificationQuestion: typeof parsed.clarificationQuestion === 'string' ? parsed.clarificationQuestion : undefined,
        explanation: 'LLM classification',
      };

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Generate AI response using Gemini API
   */
  async generateResponse(userMessage: string): Promise<AIResponse> {
    try {
      console.log(`[AIResponseService.ts] Generating AI response for: ${userMessage}`);

      if (!this.isConfigured()) {
        throw new Error('Gemini AI service is not properly configured. Please check your API key.');
      }

      // 1) Primary: LLM-based intent classification (preferred over regex heuristics)
      const llmIntent = await this.classifyIntentWithLLM(userMessage);

      if (llmIntent) {
        // If LLM suggests clarification, return it immediately
        if (llmIntent.needsClarification && llmIntent.clarificationQuestion) {
          this.addMessageToHistory('user', userMessage);
          this.addMessageToHistory('assistant', llmIntent.clarificationQuestion);
          return {
            text: llmIntent.clarificationQuestion,
            model: 'intent-service-llm',
            timestamp: new Date(),
          };
        }

        // If confident, route directly to specialized handlers using LLM entities
        if (llmIntent.confidence >= 0.7) {
          if (llmIntent.intent === 'datetime') {
            const dateTimeResponse = await this.handleDateTimeQuery(userMessage, llmIntent);
            this.addMessageToHistory('user', userMessage);
            this.addMessageToHistory('assistant', dateTimeResponse.text);
            return dateTimeResponse;
          }
          if (llmIntent.intent === 'weather') {
            const weatherResponse = await this.handleWeatherQuery(userMessage, llmIntent);
            if (weatherResponse) {
              this.addMessageToHistory('user', userMessage);
              this.addMessageToHistory('assistant', weatherResponse.text);
              return weatherResponse;
            }
          }
          if (llmIntent.intent === 'call') {
            const callResponse = await this.handleCallCommand(userMessage, llmIntent);
            if (callResponse) {
              this.addMessageToHistory('user', userMessage);
              this.addMessageToHistory('assistant', callResponse.text);
              return callResponse;
            }
          }
          if (llmIntent.intent === 'realtime') {
            try {
              const result = await webSearchService.answerRealtimeQuery(userMessage);
              if (result) {
                this.addMessageToHistory('user', userMessage);
                this.addMessageToHistory('assistant', result.text);
                return {
                  text: result.text,
                  model: 'realtime-service',
                  timestamp: new Date(),
                };
              }
            } catch (realtimeError) {
              console.warn('Realtime (LLM) query failed, falling back to heuristics/general:', realtimeError);
            }
          }
        }
      }

      // 2) Fallback: heuristic intent detection (used when LLM is absent or not confident)
      const intentResult: IntentDetectionResult = intentService.detect(userMessage);

      // Handle clarification for ambiguous or low-confidence intents
      if (intentResult.needsClarification && intentResult.clarificationQuestion) {
        this.addMessageToHistory('user', userMessage);
        this.addMessageToHistory('assistant', intentResult.clarificationQuestion);
        return {
          text: intentResult.clarificationQuestion,
          model: 'intent-service',
          timestamp: new Date(),
        };
      }

      // High-confidence routed commands
      if (intentResult.intent === 'datetime' && !intentResult.needsClarification) {
        const dateTimeResponse = await this.handleDateTimeQuery(userMessage, intentResult);
        this.addMessageToHistory('user', userMessage);
        this.addMessageToHistory('assistant', dateTimeResponse.text);
        return dateTimeResponse;
      }

      if (intentResult.intent === 'weather' && !intentResult.needsClarification) {
        try {
          const weatherResponse = await this.handleWeatherQuery(userMessage, intentResult);
          if (weatherResponse) {
            this.addMessageToHistory('user', userMessage);
            this.addMessageToHistory('assistant', weatherResponse.text);
            return weatherResponse;
          }
        } catch (weatherError) {
          console.warn('Weather query failed, falling back to AI:', weatherError);
        }
      }

      if (intentResult.intent === 'call' && !intentResult.needsClarification) {
        try {
          const callResponse = await this.handleCallCommand(userMessage, intentResult);
          if (callResponse) {
            this.addMessageToHistory('user', userMessage);
            this.addMessageToHistory('assistant', callResponse.text);
            return callResponse;
          }
        } catch (callError) {
          console.warn('Call command failed, falling back to AI:', callError);
        }
      }

      // Realtime facts (latest info): use web search service
      if (intentResult.intent === 'realtime' && !intentResult.needsClarification) {
        try {
          const result = await webSearchService.answerRealtimeQuery(userMessage);
          if (result) {
            this.addMessageToHistory('user', userMessage);
            this.addMessageToHistory('assistant', result.text);
            return {
              text: result.text,
              model: 'realtime-service',
              timestamp: new Date(),
            };
          }
        } catch (realtimeError) {
          console.warn('Realtime query failed, falling back to AI:', realtimeError);
        }
      }

      // (No secondary LLM fallback; LLM was attempted first)

      // Add user message to conversation history
      this.addMessageToHistory('user', userMessage);

      // Prepare the request payload
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: this.buildPromptWithContext(userMessage, intentResult),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.5,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      };

      // Make API request to Gemini
      const data = await this.invokeGeminiProxy(requestBody);

      // Extract the response text
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error('No response text received from Gemini AI');
      }

      // Enforce English-only policy on the model output
      const sanitizedText = this.enforceEnglishResponse(userMessage, responseText);

      // Add assistant response to conversation history
      this.addMessageToHistory('assistant', sanitizedText);

      const aiResponse: AIResponse = {
        text: sanitizedText,
        model: data?._talksy?.model || 'gemini',
        timestamp: new Date(),
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0,
        } : undefined,
      };

      console.log('AI response generated:', sanitizedText);
      return aiResponse;
    } catch (error) {
      console.error('AI response generation error:', error);

      if (error instanceof Error) {
        throw new Error(`Failed to generate AI response: ${error.message}`);
      } else {
        throw new Error('Failed to generate AI response with unknown error');
      }
    }
  }

  /**
   * Build prompt with conversation context
   */
  private buildPromptWithContext(userMessage: string, intentResult?: IntentDetectionResult): string {
    const recentMessages = this.conversationHistory.messages
      .slice(-this.maxHistoryLength)
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Add current date/time context for the AI model
    const currentDateTime = this.getCurrentDateTimeInfo();
    const dateTimeContext = `

Current date and time: ${currentDateTime}`;

    // Detect or reuse detected intent
    const detected = intentResult || intentService.detect(userMessage);

    // Add weather context if this is a weather intent
    let weatherContext = '';
    if (detected.intent === 'weather') {
      weatherContext = `

Note: This appears to be a weather-related question. If you cannot provide specific weather data, please ask the user to specify a location or suggest they enable location services. Do not make up weather information.`;
    }

    // Add call context if this is a call intent
    let callContext = '';
    if (detected.intent === 'call') {
      callContext = `

Note: This appears to be a request to make a phone call. If you cannot access contacts or make calls directly, please ask the user to specify the contact name clearly or suggest they use their phone's dialer. Do not make up contact information.`;
    }

    // Add realtime context if this is a realtime facts intent
    let realtimeContext = '';
    if (detected.intent === 'realtime') {
      realtimeContext = `

Note: This appears to require up-to-date information (e.g., latest device models or current office holders). If you don't have live data or cannot browse, do not guess or provide outdated info. Say you can't check live updates right now and suggest trying again shortly or checking a trusted source.`;
    }

    // Guidance to avoid false positives for general queries
    const intentGuidance = detected.intent === 'general' || detected.intent === 'unknown'
      ? `

Intent guidance: The user's message is a general informational question. Provide a complete, direct answer. Do not defer with "let me check" or "let me look"; do not ask to search the web. If you don't know, say so briefly and provide a concise, best-effort explanation.`
      : '';

    return `You are a helpful voice assistant. Please provide a clear, concise, and friendly response that is suitable for text-to-speech conversion. Keep responses conversational and not too long.${dateTimeContext}${weatherContext}${callContext}${realtimeContext}${intentGuidance}

Language policy:
- Always respond in English only, even if the user's message is in another language.
- If the user explicitly asks you to speak or respond in another language, politely explain that you can currently reply only in English.
- Do not produce non-English text in your response.
 - If the user requests a response in another language, acknowledge this and OFFER to complete the same task in English (for example: "Would you like me to write the story in English instead?").

Recent conversation:
${recentMessages}

Current user message: ${userMessage}

Please respond naturally and helpfully:`;
  }

  /**
   * Add message to conversation history
   */
  private addMessageToHistory(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.messages.push({
      role,
      content,
      timestamp: new Date(),
    });

    // Keep only recent messages to avoid token limits
    if (this.conversationHistory.messages.length > this.maxHistoryLength * 2) {
      this.conversationHistory.messages = this.conversationHistory.messages.slice(-this.maxHistoryLength);
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory.messages = [{
      role: 'assistant',
      content: 'I am a helpful voice assistant. I will provide clear, concise, and friendly responses to your questions.',
      timestamp: new Date(),
    }];
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationContext {
    return { ...this.conversationHistory };
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!isSupabaseConfigured && !!supabase;
  }

  private async invokeGeminiProxy(requestBody: Record<string, any>): Promise<any> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: requestBody as any,
    });

    if (error) {
      const errAny = error as any;
      const status = errAny?.context?.response?.status ?? errAny?.context?.status;
      const rawBody = errAny?.context?.body;

      let bodyDetails: string | undefined;
      if (typeof rawBody === 'string' && rawBody.length) {
        try {
          bodyDetails = JSON.stringify(JSON.parse(rawBody));
        } catch {
          bodyDetails = rawBody;
        }
      }

      throw new Error(
        `gemini-proxy failed${status ? ` (${status})` : ''}: ${error.message || 'Edge Function error'}${bodyDetails ? ` | ${bodyDetails}` : ''}`
      );
    }

    if (!data) {
      throw new Error('No data returned from gemini-proxy');
    }

    // If the Edge Function returns a structured error, surface it.
    if (typeof data === 'object' && data?.error) {
      const details = typeof data?.response === 'object' ? JSON.stringify(data.response) : (data?.details || '');
      throw new Error(`${data.error}${details ? `: ${details}` : ''}`);
    }

    return data;
  }

  /**
   * Test the AI service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateResponse('Hello, can you hear me?');
      return !!response.text;
    } catch (error) {
      console.error('AI service connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const aiResponseService = new AIResponseService();

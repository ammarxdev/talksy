export type IntentName = 'datetime' | 'weather' | 'call' | 'realtime' | 'general' | 'unknown';

export interface IntentEntities {
  location?: string;
  contactName?: string;
  // Date/Time granularity
  dateOnly?: boolean;
  timeOnly?: boolean;
  dayOnly?: boolean;
  // Realtime facts
  role?: 'prime_minister' | 'president' | 'ceo';
  country?: string;
  brand?: string;
  product?: string;
  topic?: string;
  query?: string;
}

export interface IntentDetectionResult {
  intent: IntentName;
  confidence: number; // 0.0 - 1.0
  entities: IntentEntities;
  needsClarification: boolean;
  clarificationQuestion?: string;
  explanation?: string;
}

export interface IntentDetectorPlugin {
  name: IntentName;
  detect(message: string): IntentDetectionResult | null;
}

/** Utility helpers */
const normalize = (text: string): string => text.trim().toLowerCase();

const containsAny = (text: string, keywords: string[]): boolean =>
  keywords.some(k => text.includes(k));

const matchesAny = (text: string, patterns: RegExp[]): boolean =>
  patterns.some(p => p.test(text));

// Safer word matcher: checks full words/phrases using word boundaries
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const containsAnyWord = (text: string, words: string[]): boolean => {
  return words.some(w => {
    // Allow flexible whitespace in multi-word phrases like "time zone"
    const flexible = escapeRegExp(w).replace(/\s+/g, '\\s+');
    const pattern = new RegExp(`\\b${flexible}\\b`, 'i');
    return pattern.test(text);
  });
};

const extractAfterKeywords = (text: string, patterns: RegExp[]): string | null => {
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const candidate = m[1]
        .replace(/\b(please|now|right\s+now|immediately|asap)\b/gi, '')
        .trim();
      if (candidate.length > 0) return candidate;
    }
  }
  return null;
};

/**
 * Heuristic: determine if a captured string is likely to be a human name rather than a sentence
 */
const isLikelyPersonName = (text: string): boolean => {
  const candidate = text.trim();
  if (!candidate) return false;
  // Reject if contains question marks or sentence punctuation suggesting a full sentence
  if (/[\?\.!]/.test(candidate)) return false;
  // Reject if contains words that rarely appear in names
  const disallowedTokens = [
    'should', 'would', 'could', 'can', 'ask', 'for', 'a', 'treat', 'buy', 'new', 'phone', 'latest', 'model',
    'weather', 'time', 'date', 'today', 'now', 'current', 'camera', 'battery', 'storage', 'of', 'the', 'so',
    // Health/advice and general help terms should never be treated as names
    'feeling', 'feelings', 'depression', 'anxiety', 'therapy', 'therapist', 'psychological',
    'recommend', 'help', 'cope', 'coping', 'sleep', 'sleeping', 'insomnia', 'motivation', 'sadness',
    'withdraw', 'withdrawal', 'issue', 'problem', 'with', 'this', 'these', 'that'
  ];
  const tokens = candidate.toLowerCase().split(/\s+/).filter(Boolean);
  // If more than 4 tokens or many disallowed tokens, unlikely to be a name
  const disallowedCount = tokens.filter(t => disallowedTokens.includes(t)).length;
  if (tokens.length > 4 || disallowedCount >= 1) return false;
  return true;
};

/**
 * High-precision Date/Time detector
 */
const dateTimeDetector: IntentDetectorPlugin = {
  name: 'datetime',
  detect(message: string): IntentDetectionResult | null {
    const text = normalize(message);

    // Strong, explicit patterns
    const strongPatterns = [
      /\bwhat\s+(time|date)\s+is\s+it\b/i,
      /\bwhat\s+is\s+the\s+(time|date)\b/i,
      /\bcurrent\s+(time|date)\b/i,
      /\btell\s+me\s+the\s+(time|date)\b/i,
      /\bwhat\s+day\s+is\s+it\b/i,
      /\btime\s+in\s+[a-zA-Z\s,]+(?:\?|$)/i,
      /\bdate\s+in\s+[a-zA-Z\s,]+(?:\?|$)/i,
    ];

    const negativePhrases = [
      'time complexity', 'compile time', 'build time', 'response time',
      'real-time', 'runtime', 'downtime', 'uptime', 'time travel',
      'time management', 'time zone converter', 'timezone offset',
      // Avoid substring traps and unrelated forms
      'sometimes', 'sometime', 'meantime', 'timer', 'timing', 'timeout', 'timeframe', 'part-time', 'full-time', 'lifetime'
    ];

    if (containsAny(text, negativePhrases)) {
      return null;
    }

    const hasStrong = matchesAny(text, strongPatterns);

    // Softer signals (intentionally exclude generic 'day' to avoid false positives)
    const softKeywords = ['time', 'date', 'clock', 'timezone', 'time zone'];
    // Use word-boundary matching so 'sometimes' doesn't trigger
    const hasSoft = containsAnyWord(text, softKeywords);

    if (!hasStrong && !hasSoft) return null;

    // Determine granularity
    const mentionsTime = /\bwhat\s+time\s+is\s+it\b|\bcurrent\s+time\b|\btime\b|\btime\s+in\b/i.test(text);
    const mentionsDate = /\bwhat\s+date\s+is\s+it\b|\bcurrent\s+date\b|\bdate\b|\bdate\s+in\b/i.test(text);
    const mentionsDay = /\bwhat\s+day\s+is\s+it\b/i.test(text);
    const timeOnly = mentionsTime && !mentionsDate && !mentionsDay;
    const dateOnly = mentionsDate && !mentionsTime && !mentionsDay;
    const dayOnly = mentionsDay && !mentionsTime && !mentionsDate;

    // Extract possible location for clarity prompt (optional; primary handling stays in AIResponseService)
    const locationMatch = text.match(/(?:time|date|day).*?(?:in|at|for)\s+([a-zA-Z\s,]+?)(?:\?|\.|$)/i);
    const location = locationMatch && locationMatch[1]
      ? locationMatch[1].replace(/\b(today|now|current|right now)\b/gi, '').trim()
      : undefined;

    const confidence = hasStrong ? 0.92 : 0.65; // keep soft signals below clarifying threshold to reduce false positives

    // Only ask for clarification if it's truly vague (e.g., just "timezone"/"clock")
    const trulyVague = !hasStrong && !timeOnly && !dateOnly && !dayOnly;

    return {
      intent: 'datetime',
      confidence,
      entities: { location, timeOnly, dateOnly, dayOnly },
      // For soft matches, avoid prompting; let aggregator decide
      needsClarification: hasStrong ? trulyVague : false,
      clarificationQuestion: trulyVague
        ? (location
            ? `Do you want the current time or the date for ${location}?`
            : 'Do you want the current time or the date? You can also ask for the time in a specific city.')
        : undefined,
      explanation: hasStrong ? 'Matched explicit date/time pattern.' : 'Matched time/date keywords.'
    };
  }
};

/**
 * High-precision Weather detector
 */
const weatherDetector: IntentDetectorPlugin = {
  name: 'weather',
  detect(message: string): IntentDetectionResult | null {
    const text = normalize(message);
    const positive = [
      'weather', 'forecast', 'temperature', 'rain', 'sunny', 'cloudy', 'storm',
      'humidity', 'wind', 'snow', 'precipitation', 'climate', 'degrees', 'celsius', 'fahrenheit'
    ];
    const negativeContext = [
      'time complexity', 'build time', 'response time', 'call me', 'dial', 'phone', 'contact',
      // Health/advice contexts (to prevent misclassifying health questions)
      'fever', 'sick', 'ill', 'doctor', 'symptom', 'dizzy', 'headache', 'medicine', 'treatment', 'what should i do', 'issue', 'problem'
    ];

    if (containsAny(text, negativeContext)) return null;

    const hasStrong = matchesAny(text, [
      /\bwhat(?:'s| is)?\s+the\s+(?:weather|forecast)\b/i,
      /\b(?:weather|forecast)\s+(?:in|for|at)\s+[a-zA-Z\s,]+/i,
      /\bhow\s+hot\b|\bhow\s+cold\b/i,
    ]);
    const hasPositiveWord = containsAnyWord(text, positive);
    if (!hasStrong && !hasPositiveWord) return null;

    // Extract coarse location for clarification
    const locMatch = text.match(/(?:in|at|for)\s+([a-zA-Z\s,]+?)(?:\?|\.|$)/i);
    const location = locMatch && locMatch[1]
      ? locMatch[1].replace(/\b(today|now|current|right now)\b/gi, '').trim()
      : undefined;

    const confidence = hasStrong ? 0.9 : 0.65; // keep soft signals below clarifying threshold
    const needsClarification = hasStrong && !location; // only prompt when clearly about weather

    return {
      intent: 'weather',
      confidence,
      entities: { location },
      needsClarification,
      clarificationQuestion: needsClarification
        ? 'Do you want the weather? If so, for which city?'
        : undefined,
      explanation: hasStrong ? 'Matched explicit weather phrase.' : 'Matched weather-related keywords.'
    };
  }
};

/**
 * High-precision Call detector
 */
const callDetector: IntentDetectorPlugin = {
  name: 'call',
  detect(message: string): IntentDetectionResult | null {
    const text = normalize(message);
    const strongCallPatterns = [
      /^(?:please\s+)?(?:call|dial|ring)\s+(.+?)(?:\s+(?:please|now|right\s+now))?$/i,
      /^(?:can|could|would|will)\s+you\s+(?:call|dial|ring|contact)\s+(.+?)(?:\s+(?:please|now|right\s+now))?\??$/i,
      /^(?:make|place)\s+a\s+(?:call|phone)\s+to\s+(.+?)(?:\s+(?:please|now|right\s+now))?$/i,
      /^get\s+in\s+touch\s+with\s+(.+?)(?:\s+(?:please|now|right\s+now))?$/i,
      /^contact\s+(.+?)(?:\s+(?:please|now|right\s+now))?$/i,
    ];
    const phoneNumberForPattern = /\bphone\s+number\s+for\s+(.+?)\b/i;
    const hasStrongCommand = matchesAny(text, strongCallPatterns) || phoneNumberForPattern.test(text);

    const negativeContext = [
      'weather', 'forecast', 'temperature', 'time', 'date', 'iphone', 'android', 'samsung', 'pixel',
      'buy phone', 'new phone', 'latest model', 'camera', 'storage', 'battery',
      // Health/advice and general help contexts
      'feeling', 'feelings', 'depression', 'anxiety', 'therapy', 'therapist', 'psychological', 'recommend', 'help',
      'cope', 'coping', 'sleep', 'sleeping', 'insomnia', 'motivation', 'sadness', 'withdraw', 'withdrawal', 'issue', 'problem'
    ];
    if (containsAny(text, negativeContext) && !hasStrongCommand) return null;

    if (!hasStrongCommand) return null;

    // Extract name from strong patterns only
    let contactName = extractAfterKeywords(text, strongCallPatterns) || (text.match(phoneNumberForPattern)?.[1] ?? undefined);
    // If the captured contact name looks like a sentence or generic phrase, discard it
    if (contactName && !isLikelyPersonName(contactName)) {
      contactName = undefined;
    }

    if (!contactName) {
      return {
        intent: 'call',
        confidence: 0.7,
        entities: {},
        needsClarification: true,
        clarificationQuestion: 'Who would you like to call?',
        explanation: 'Detected a clear calling command, but no name was provided.'
      };
    }

    const confidence = 0.9;
    return {
      intent: 'call',
      confidence,
      entities: { contactName },
      needsClarification: false,
      explanation: 'Found a probable contact name after a strong call command.'
    };
  }
};

/**
 * Realtime facts detector (current office holders, latest product models)
 */
const realtimeFactsDetector: IntentDetectorPlugin = {
  name: 'realtime',
  detect(message: string): IntentDetectionResult | null {
    const text = normalize(message);

    // Who is the prime minister/president of X (handle common misspellings)
    const officePatterns: Array<{regex: RegExp, role: 'prime_minister' | 'president'}> = [
      { regex: /\bwho\s+is\s+(?:the\s+)?(?:current\s+)?prime\s+mi\w*ster\s+of\s+([a-zA-Z\s,]+)\b/i, role: 'prime_minister' },
      { regex: /\bprime\s+mi\w*ster\s+of\s+([a-zA-Z\s,]+)\b/i, role: 'prime_minister' },
      { regex: /\bwho\s+is\s+(?:the\s+)?(?:current\s+)?president\s+of\s+([a-zA-Z\s,]+)\b/i, role: 'president' },
      { regex: /\bpresident\s+of\s+([a-zA-Z\s,]+)\b/i, role: 'president' },
    ];

    for (const p of officePatterns) {
      const m = message.match(p.regex);
      if (m && m[1]) {
        const countryRaw = m[1].trim();
        return {
          intent: 'realtime',
          confidence: 0.92,
          entities: { role: p.role, country: countryRaw, query: message },
          needsClarification: false,
          explanation: 'Matched current office holder query.'
        };
      }
    }

    // Latest/newest iPhone model queries
    const latestDevicePatterns: RegExp[] = [
      /\bwhat\s+is\s+the\s+latest\s+iphone\b/i,
      /\bwhat'?s\s+the\s+latest\s+iphone\b/i,
      /\blatest\s+(?:model\s+of\s+)?iphone\b/i,
      /\bcurrent\s+iphone\s+model\b/i,
      /\bnew\s+iphone\b/i,
      /\bnewest\s+iphone\b/i,
      /\biphone\s+latest\b/i,
      /\bmost\s+recent\s+iphone\b/i,
    ];
    for (const r of latestDevicePatterns) {
      const m = message.match(r);
      if (m) {
        const brand = 'apple';
        const product = 'iphone';
        return {
          intent: 'realtime',
          confidence: 0.9,
          entities: { brand, product, query: message },
          needsClarification: false,
          explanation: 'Matched latest iPhone model query.'
        };
      }
    }

    return null;
  }
};

/**
 * Intent aggregation and ambiguity handling
 */
export class IntentService {
  private readonly detectors: IntentDetectorPlugin[];
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private readonly CLARIFYING_THRESHOLD = 0.7;

  constructor(detectors?: IntentDetectorPlugin[]) {
    this.detectors = detectors && detectors.length > 0
      ? detectors
      : [dateTimeDetector, weatherDetector, callDetector, realtimeFactsDetector];
  }

  detect(message: string): IntentDetectionResult {
    const text = normalize(message);
    const results = this.detectors
      .map(d => d.detect(message))
      .filter((r): r is IntentDetectionResult => !!r)
      .sort((a, b) => b.confidence - a.confidence);

    if (results.length === 0) {
      return {
        intent: 'general',
        confidence: 0.0,
        entities: {},
        needsClarification: false,
        explanation: 'No command-like intent detected.'
      };
    }

    const best = results[0];
    const second = results[1];

    // General question guard: treat common informational/advice phrases or long texts as general
    const isGeneralQuestion = /^(why|how|who|what\s+is|what's|explain|tell\s+me\s+about)\b/i.test(text)
      || /\b(should\s+i|could\s+i|can\s+i|would\s+it|is\s+it\s+ok(?:ay)?|do\s+you\s+think|would\s+you\s+recommend|what\s+would\s+you\s+recommend)\b/i.test(text)
      || /(what\s+is\s+the\s+issue|i\s+feel\b|i\s+have\b|i\s+am\s+feeling\b|i'm\s+feeling\b|symptom\b|issue\b|problem\b|depression\b|anxiety\b|therapy\b|therapist\b|insomnia\b|sleep\b|sadness\b|motivation\b|cope\b|coping\b|withdraw\b)/i.test(text)
      || (text.length > 160);

    const hasHighConfidenceCommand = best && best.confidence >= this.HIGH_CONFIDENCE_THRESHOLD;
    if (isGeneralQuestion && !hasHighConfidenceCommand) {
      return {
        intent: 'general',
        confidence: best.confidence,
        entities: {},
        needsClarification: false,
        explanation: 'General informational/explanatory question – avoid command routing.'
      };
    }

    // If top result is weak, fall back to general
    if (best.confidence < this.CLARIFYING_THRESHOLD) {
      return {
        intent: 'general',
        confidence: best.confidence,
        entities: best.entities,
        needsClarification: false,
        explanation: 'Low confidence command; treat as general conversation.'
      };
    }

    // Ambiguity: two intents close together
    if (second && Math.abs(best.confidence - second.confidence) < 0.1) {
      return {
        intent: 'unknown',
        confidence: best.confidence,
        entities: best.entities,
        needsClarification: true,
        clarificationQuestion: 'Did you mean weather, time/date, calling, or something else?',
        explanation: 'Multiple intents detected with similar confidence.'
      };
    }

    // If not high confidence, ask a targeted clarification provided by the detector
    if (best.confidence < this.HIGH_CONFIDENCE_THRESHOLD) {
      return {
        ...best,
        needsClarification: true,
      };
    }

    // High confidence
    return {
      ...best,
      needsClarification: false,
    };
  }
}

export const intentService = new IntentService();



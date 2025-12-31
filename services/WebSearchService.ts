import { intentService } from './IntentService';

export interface RealtimeAnswerResult {
  text: string;
  sources?: Array<{ title: string; url: string }>;
}

class WebSearchService {
  private readonly DEFAULT_HEADERS: Record<string, string> = {
    'User-Agent': 'VoiceAssistent/1.0 (https://example.local; support@example.local)',
    'Accept': 'application/json',
  };

  private async fetchJson(url: string, init?: RequestInit): Promise<any | null> {
    try {
      const supportsAbort = typeof (globalThis as any).AbortController !== 'undefined';
      if (supportsAbort) {
        const controller = new (globalThis as any).AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, {
          ...init,
          headers: { ...(this.DEFAULT_HEADERS), ...(init?.headers || {}) },
          signal: controller.signal,
        } as RequestInit);
        clearTimeout(timeout);
        if (!res.ok) return null;
        return await res.json();
      }

      // Fallback without abort support: soft-timeout via Promise.race
      const res = await Promise.race([
        fetch(url, { ...init, headers: { ...(this.DEFAULT_HEADERS), ...(init?.headers || {}) } } as RequestInit),
        new Promise<Response | null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ]) as Response | null;
      if (!res) return null;
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }
  async answerRealtimeQuery(message: string): Promise<RealtimeAnswerResult | null> {
    const detected = intentService.detect(message);

    try {
      // Handle office holder queries
      if (detected.entities.role && detected.entities.country) {
        const normalizedCountry = this.normalizeCountryName(detected.entities.country);
        const countryQid = await this.resolveCountryQID(normalizedCountry);
        if (!countryQid) {
          return {
            text: `I couldn't identify the country "${normalizedCountry}". Please specify the country name more clearly.`,
          };
        }

        // Special case: some countries don't have a prime minister
        if (detected.entities.role === 'prime_minister') {
          const hasPM = await this.countryTypicallyHasPrimeMinister(countryQid);
          if (!hasPM) {
            // Fall back to head of government (P6), which may be a President
            const gov = await this.fetchCountryOfficeHolder(countryQid, 'P6');
            if (gov) {
              return {
                text: `${normalizedCountry} does not have a prime minister. The head of government is ${gov.label}.`,
                sources: [gov.source].filter(Boolean) as Array<{ title: string; url: string }>,
              };
            }
          }
        }

        const property = detected.entities.role === 'president' ? 'P35' : 'P6'; // head of state vs head of government
        const holder = await this.fetchCountryOfficeHolderSPARQL(countryQid, property)
          || await this.fetchCountryOfficeHolder(countryQid, property);
        if (holder) {
          const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
          return {
            text: `As of ${dateStr}, the ${detected.entities.role === 'president' ? 'President' : 'head of government'} of ${normalizedCountry} is ${holder.label}.`,
            sources: [holder.source].filter(Boolean) as Array<{ title: string; url: string }>,
          };
        }

        // Let caller fall back to general AI if not found
        return null;
      }

      // Handle latest iPhone model queries
      if (/(latest|current)\s+(model\s+of\s+)?iphone/i.test(message) || /\bnew\s+iphone\b/i.test(message) || /\bnewest\s+iphone\b/i.test(message) || /\bwhat('?|\s+is)\s+the\s+latest\s+iphone\b/i.test(message) || /\biphone\s+latest\b/i.test(message) || /\bmost\s+recent\s+iphone\b/i.test(message)) {
        const latest = await this.fetchLatestIPhoneModel()
          || await this.fetchLatestIPhoneModelByLabelScan();
        if (latest) {
          const asOf = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
          return {
            text: `As of ${asOf}, the latest iPhone model is ${latest.name}${latest.date ? ` (released on ${latest.date})` : ''}.`,
            sources: latest.source ? [latest.source] : undefined,
          };
        }
        // Let caller fall back to general AI if not found
        return null;
      }

      return null;
    } catch (error) {
      console.warn('WebSearchService error:', error);
      return null;
    }
  }

  private normalizeCountryName(name: string): string {
    const n = name.trim().toLowerCase();
    if (['us', 'u.s.', 'u.s', 'usa', 'u.s.a', 'america', 'united states of america'].includes(n)) {
      return 'United States';
    }
    if (n === 'uk' || n === 'u.k.' || n === 'england' || n === 'great britain' || n === 'britain') {
      return 'United Kingdom';
    }
    return name.trim();
  }

  private async resolveCountryQID(countryName: string): Promise<string | null> {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(countryName)}&language=en&format=json&type=item&origin=*`;
    const data = await this.fetchJson(url, { headers: { 'Accept': 'application/json' } });
    const hit = data.search?.[0];
    return hit?.id || null;
  }

  private async fetchCountryOfficeHolder(countryQid: string, property: 'P6' | 'P35'):
    Promise<{ label: string; qid: string; source?: { title: string; url: string } } | null> {
    // Fetch the country entity to get the office holder QID
    const url = `https://www.wikidata.org/wiki/Special:EntityData/${countryQid}.json`;
    const data = await this.fetchJson(url, { headers: { 'Accept': 'application/json' } });
    if (!data) return null;
    const entity = data.entities?.[countryQid];
    const claims = entity?.claims?.[property];
    const statement = Array.isArray(claims) ? claims[0] : undefined;
    const holderQid = statement?.mainsnak?.datavalue?.value?.id;
    if (!holderQid) return null;

    const holder = await this.fetchEntityLabel(holderQid);
    return holder;
  }

  private async fetchEntityLabel(qid: string): Promise<{ label: string; qid: string; source?: { title: string; url: string } } | null> {
    const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
    const data = await this.fetchJson(url, { headers: { 'Accept': 'application/json' } });
    if (!data) return null;
    const entity = data.entities?.[qid];
    const label = entity?.labels?.en?.value || entity?.labels?.[Object.keys(entity?.labels || {})[0]]?.value;
    if (!label) return null;
    // Try to find a Wikipedia sitelink for source
    const enwiki = entity?.sitelinks?.enwiki?.title as string | undefined;
    const source = enwiki ? { title: enwiki, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(enwiki)}` } : undefined;
    return { label, qid, source };
  }

  private async countryTypicallyHasPrimeMinister(countryQid: string): Promise<boolean> {
    // Heuristic: if country uses a presidential system with no PM, P6 might be President; still, we handle by returning false for a known set
    // We can query head of government office type, but to keep simple, return false for United States
    if (countryQid === 'Q30') { // United States
      return false;
    }
    return true;
  }

  private async fetchLatestIPhoneModel(): Promise<{ name: string; date?: string; source?: { title: string; url: string } } | null> {
    const sparql = `
      SELECT ?item ?itemLabel (COALESCE(?date, ?inception) AS ?release) WHERE {
        ?item wdt:P176 wd:Q312 .
        ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
        FILTER(STRSTARTS(LCASE(?label), "iphone"))
        OPTIONAL { ?item wdt:P577 ?date }
        OPTIONAL { ?item wdt:P571 ?inception }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      ORDER BY DESC(?release)
      LIMIT 1
    `;
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
    const data = await this.fetchJson(url, { headers: { 'Accept': 'application/sparql-results+json' } });
    const b = data?.results?.bindings?.[0];
    if (!b) return null;
    const name = b.itemLabel?.value as string | undefined;
    const date = b.release?.value ? new Date(b.release.value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined;
    const itemUrl = b.item?.value as string | undefined;
    const source = itemUrl ? { title: name || 'Wikidata', url: itemUrl } : undefined;
    if (!name) return null;
    return { name, date, source };
  }

  private async fetchLatestIPhoneModelByLabelScan(): Promise<{ name: string; date?: string; source?: { title: string; url: string } } | null> {
    const sparql = `
      SELECT ?item ?itemLabel WHERE {
        ?item wdt:P176 wd:Q312 .
        ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
        FILTER(STRSTARTS(LCASE(?label), "iphone"))
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
    `;
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
    const data = await this.fetchJson(url, { headers: { 'Accept': 'application/sparql-results+json' } });
    const items: Array<{ item: { value: string }, itemLabel: { value: string } }> = data?.results?.bindings || [];
    if (!items.length) return null;
    // Sort labels by numeric suffix if present (e.g., iPhone 16 > iPhone 15)
    const parsed = items
      .map(b => ({ label: b.itemLabel.value, url: b.item.value }))
      .filter(x => /iphone\s+(\d+)/i.test(x.label))
      .sort((a, b) => {
        const na = parseInt((a.label.match(/iphone\s+(\d+)/i) || [])[1] || '0', 10);
        const nb = parseInt((b.label.match(/iphone\s+(\d+)/i) || [])[1] || '0', 10);
        return nb - na;
      });
    const top = parsed[0] || items[0];
    if (!top) return null;
    return { name: top.label, source: { title: top.label, url: top.url } };
  }

  private async fetchCountryOfficeHolderSPARQL(countryQid: string, property: 'P6' | 'P35'):
    Promise<{ label: string; qid: string; source?: { title: string; url: string } } | null> {
    const sparql = `
      SELECT ?holder ?holderLabel WHERE {
        wd:${countryQid} p:${property} ?statement .
        ?statement ps:${property} ?holder .
        FILTER NOT EXISTS { ?statement pq:P582 ?end }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
      }
      LIMIT 1`;
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
    const data = await this.fetchJson(url, { headers: { 'Accept': 'application/sparql-results+json' } });
    const b = data?.results?.bindings?.[0];
    if (!b) return null;
    const holderUrl: string | undefined = b.holder?.value;
    const holderQid = holderUrl ? holderUrl.substring(holderUrl.lastIndexOf('/') + 1) : undefined;
    if (!holderQid) return null;
    return await this.fetchEntityLabel(holderQid);
  }
}

export const webSearchService = new WebSearchService();



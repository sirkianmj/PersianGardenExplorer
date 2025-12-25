import { Paper, HistoricalPeriod, ResearchTopic } from '../types';

// --- Configuration ---
// Using corsproxy.io to bypass CORS restrictions on Iranian academic sites
const CORS_PROXY = 'https://corsproxy.io/?'; 

const SEMANTIC_SCHOLAR_BASE = 'https://api.semanticscholar.org/graph/v1/paper/search';
const SEMANTIC_FIELDS = 'paperId,title,authors,year,abstract,venue,url,openAccessPdf';

const CROSSREF_BASE = 'https://api.crossref.org/works';

export const initializeGemini = (apiKey: string) => {
  console.log("Initialized Academic Services");
};

export const isGeminiInitialized = (): boolean => {
  return true;
};

// --- Helpers ---

const PERSIAN_REGEX = /[\u0600-\u06FF]/;

const isPersian = (text: string): boolean => {
  return PERSIAN_REGEX.test(text);
};

const cleanAbstract = (text: string | undefined): string => {
  if (!text) return "";
  return text.replace(/<[^>]*>?/gm, '').substring(0, 600) + (text.length > 600 ? '...' : '');
};

/**
 * STRATEGY: Intelligent Query Sanitization
 * Legacy Persian databases (SID, NoorMags) crash or give junk results if we send:
 * 1. Boolean operators ("OR", "AND")
 * 2. English words mixed with Persian
 * 3. Parentheses
 * 
 * We create cleaners to separate the query.
 */

// Extracts only Persian text and numbers, removes booleans/punctuation
const extractPersianQuery = (query: string): string => {
  // Remove boolean keywords (case insensitive)
  let clean = query.replace(/\b(OR|AND|NOT)\b/gi, ' ');
  // Remove non-persian characters (keep numbers and spaces)
  // Range includes Persian, Arabic, and ZWNJ
  return clean.replace(/[^\u0600-\u06FF\s0-9]/g, '').replace(/\s+/g, ' ').trim();
};

// Extracts only English text, removes booleans/punctuation
const extractEnglishQuery = (query: string): string => {
   let clean = query.replace(/\b(OR|AND|NOT)\b/gi, ' ');
   // Remove Persian characters
   return clean.replace(/[\u0600-\u06FF]/g, '').replace(/[()"]/g, '').replace(/\s+/g, ' ').trim();
};

// Removes Booleans and Parentheses but keeps both languages (for robust engines like Google/SID)
const cleanMixedQuery = (query: string): string => {
    return query.replace(/\b(OR|AND|NOT)\b/gi, ' ').replace(/[()"]/g, '').replace(/\s+/g, ' ').trim();
};

// --- Real-Time Scrapers ---

/**
 * Scrapes NoorMags (Specialized Iranian Magazines)
 * CRITICAL: Must receive ONLY Persian keywords.
 */
const fetchNoorMags = async (rawQuery: string): Promise<Partial<Paper>[]> => {
    try {
        const smartQuery = extractPersianQuery(rawQuery);
        if (smartQuery.length < 2) return []; // Skip if no persian text

        const encodedQuery = encodeURIComponent(smartQuery);
        const targetUrl = `https://www.noormags.ir/view/fa/search?q=${encodedQuery}`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) return [];
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const titleLinks = Array.from(doc.querySelectorAll('.search-result-item .title a, .article_list .title a, h3 a'));

        return titleLinks.map((link, index) => {
            const title = link.textContent?.trim();
            const href = (link as HTMLAnchorElement).getAttribute('href');
            
            if (!title || !href) return null;

            const fullUrl = href.startsWith('http') ? href : `https://www.noormags.ir${href}`;

            return {
                id: `noormags-${index}-${Date.now()}`,
                title: title,
                authors: ['NoorMags Contributor'],
                year: 'N/A',
                source: 'NoorMags',
                abstract: 'جهت مشاهده متن کامل به سایت نورمگز مراجعه فرمایید.',
                url: fullUrl,
                isLocal: false,
                addedAt: Date.now(),
                language: 'fa',
                apiSource: 'NoorMags'
            };
        }).filter(Boolean) as Partial<Paper>[];

    } catch (e) {
        console.warn("NoorMags scrape warning:", e);
        return [];
    }
};

/**
 * Scrapes Ganjoor (Persian Literature)
 * CRITICAL: Must receive ONLY Persian keywords.
 */
const fetchGanjoor = async (rawQuery: string): Promise<Partial<Paper>[]> => {
    try {
        const smartQuery = extractPersianQuery(rawQuery);
        if (smartQuery.length < 2) return [];

        const encodedQuery = encodeURIComponent(smartQuery);
        const targetUrl = `https://ganjoor.net/?s=${encodedQuery}`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) return [];
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const items = Array.from(doc.querySelectorAll('article, .post, .entry'));
        
        const results = items.map((item, index) => {
            const titleEl = item.querySelector('h2 a, h3 a, .entry-title a');
            const snippetEl = item.querySelector('.entry-content, .excerpt, p');
            
            if (!titleEl) return null;

            return {
                id: `ganjoor-${index}-${Date.now()}`,
                title: titleEl.textContent?.trim() || 'Unknown Title',
                authors: ['Ganjoor Archive'],
                year: 'N/A',
                source: 'Ganjoor (Literature)',
                abstract: snippetEl?.textContent?.trim().substring(0, 200) + '...' || 'Poetic reference.',
                url: (titleEl as HTMLAnchorElement).href,
                isLocal: false,
                addedAt: Date.now(),
                language: 'fa',
                apiSource: 'Ganjoor'
            };
        }).filter(Boolean) as Partial<Paper>[];

        return results;

    } catch (e) {
        console.warn("Ganjoor scrape warning:", e);
        return [];
    }
};

/**
 * Scrapes SID (Scientific Information Database)
 * Handles mixed queries better, but we strip Booleans to be safe.
 * NOW UPDATED: Prefer Pure Persian Query for better results in Iranian DB.
 */
const fetchSID = async (rawQuery: string): Promise<Partial<Paper>[]> => {
    try {
        // IMPROVEMENT: If query has Persian text, strip English completely for SID.
        // This avoids SID matching "Garden" in English titles instead of "Bagh" in Persian.
        let smartQuery = "";
        if (PERSIAN_REGEX.test(rawQuery)) {
            smartQuery = extractPersianQuery(rawQuery);
        } else {
            smartQuery = cleanMixedQuery(rawQuery);
        }

        const encodedQuery = encodeURIComponent(smartQuery);
        
        const targetUrl = `https://www.sid.ir/fa/search/paper/paper?q=${encodedQuery}`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) return [];
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const links = Array.from(doc.querySelectorAll('a[href*="/paper/"], a[href*="ViewPaper"]'));
        const uniquePapers = new Map<string, Partial<Paper>>();

        links.forEach((link, index) => {
            const href = (link as HTMLAnchorElement).getAttribute('href');
            if (!href) return;
            
            const fullLink = href.startsWith('http') ? href : `https://www.sid.ir${href}`;
            const title = link.textContent?.trim();

            if (!title || title.length < 5 || title.includes("دانلود") || title.includes("PDF")) return;
            if (uniquePapers.has(fullLink)) return;

            const parentText = link.parentElement?.parentElement?.textContent || "";
            const yearMatch = parentText.match(/[1-4][0-9]{3}/);

            uniquePapers.set(fullLink, {
                id: `sid-${index}-${Date.now()}`,
                title: title,
                authors: ['SID Scholar'],
                year: yearMatch ? yearMatch[0] : '1400',
                source: 'SID',
                abstract: 'برای مشاهده چکیده و متن کامل به پایگاه SID مراجعه کنید.',
                url: fullLink,
                isLocal: false,
                addedAt: Date.now(),
                language: 'fa',
                apiSource: 'SID'
            });
        });

        return Array.from(uniquePapers.values()).slice(0, 10);

    } catch (e) {
        console.warn("SID scrape warning:", e);
        return [];
    }
};

// --- API Fetchers (Global) ---

/**
 * Semantic Scholar
 * CRITICAL: Should receive primarily English if possible, or mixed. 
 * Persian-only queries often fail or return nothing.
 */
const fetchSemanticScholar = async (rawQuery: string): Promise<Partial<Paper>[]> => {
  try {
    let smartQuery = extractEnglishQuery(rawQuery);
    
    // Fallback: If no English text found (user typed only Persian), use the raw Persian
    // But clean the booleans out.
    if (smartQuery.length < 3) {
        smartQuery = cleanMixedQuery(rawQuery);
    }

    const targetUrl = `${SEMANTIC_SCHOLAR_BASE}?query=${encodeURIComponent(smartQuery)}&limit=8&fields=${SEMANTIC_FIELDS}`;
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) return [];

    const text = await response.text();
    if (text.includes("Too Many Requests") || text.includes("Rate Limit")) return [];

    let data;
    try { data = JSON.parse(text); } catch (e) { return []; }
    
    if (!data.data) return [];

    return data.data.map((paper: any) => ({
      id: paper.paperId || crypto.randomUUID(),
      title: paper.title,
      authors: paper.authors?.map((a: any) => a.name) || ['Unknown'],
      year: paper.year?.toString() || 'n.d.',
      source: paper.venue || 'Semantic Scholar',
      abstract: paper.abstract || 'Abstract not available.',
      url: paper.openAccessPdf?.url || paper.url,
      isLocal: false,
      addedAt: Date.now(),
      language: isPersian(paper.title) ? 'fa' : 'en',
      apiSource: 'Semantic Scholar',
      citationCount: 0
    }));

  } catch (error) {
    console.warn("Semantic fetch error", error);
    return [];
  }
};

const fetchCrossRef = async (rawQuery: string): Promise<Partial<Paper>[]> => {
  try {
    let smartQuery = extractEnglishQuery(rawQuery);
    if (smartQuery.length < 3) smartQuery = cleanMixedQuery(rawQuery);

    const targetUrl = `${CROSSREF_BASE}?query.bibliographic=${encodeURIComponent(smartQuery)}&rows=10&sort=relevance`;
    const response = await fetch(targetUrl);
    if (!response.ok) return [];
    
    const data = await response.json();
    if (!data.message || !data.message.items) return [];

    return data.message.items.map((item: any) => {
        const title = item.title?.[0] || 'Untitled';
        const abstract = cleanAbstract(item.abstract);
        return {
          id: item.DOI || crypto.randomUUID(),
          title: title,
          authors: item.author?.map((a: any) => `${a.given} ${a.family}`) || ['Unknown'],
          year: item.created?.['date-parts']?.[0]?.[0]?.toString() || 'n.d.',
          source: item['container-title']?.[0] || item.publisher || 'CrossRef',
          abstract: abstract || 'Abstract not provided.',
          url: item.URL,
          isLocal: false,
          addedAt: Date.now(),
          language: isPersian(title) ? 'fa' : 'en',
          apiSource: 'CrossRef',
          citationCount: item['is-referenced-by-count'] || 0
        };
    });
  } catch (error) {
    console.warn("CrossRef error", error);
    return [];
  }
};

// --- Main Search Function ---

export const searchAcademicPapers = async (
  query: string,
  period: HistoricalPeriod,
  topic: ResearchTopic
): Promise<Partial<Paper>[]> => {
  
  // Clean basic input
  let searchString = query;

  // Append period if selected (but keep it simple)
  if (period && period !== HistoricalPeriod.ALL) {
      let periodTerm = period.toString();
      if (periodTerm.includes('&')) {
          periodTerm = periodTerm.split('&')[0].trim();
      }
      // Add period to search string only if not already there
      if (!searchString.includes(periodTerm)) {
          searchString += ` ${periodTerm}`;
      }
  }
  
  console.log(`Executing Distributed Search: [${searchString}]`);
  
  // Note: We pass the 'searchString' to all, but each fetcher now internalizes 
  // the logic to strip the parts of the string it doesn't understand.
  
  const results = await Promise.allSettled([
      fetchSID(searchString),          
      fetchNoorMags(searchString),     
      fetchGanjoor(searchString),      
      fetchSemanticScholar(searchString), 
      fetchCrossRef(searchString)         
  ]);

  let combined: Partial<Paper>[] = [];

  results.forEach(result => {
      if (result.status === 'fulfilled') {
          combined = [...combined, ...result.value];
      }
  });

  // Post-processing: Deduplicate by title similarity or exact ID
  const uniqueMap = new Map();
  combined.forEach(p => {
      // Basic normalization for dedupe
      const normTitle = p.title?.toLowerCase().replace(/\s+/g, ' ').trim();
      if(normTitle && !uniqueMap.has(normTitle)) {
          uniqueMap.set(normTitle, p);
      }
  });

  return Array.from(uniqueMap.values()).map(p => ({
    ...p,
    period: period !== HistoricalPeriod.ALL ? period : undefined,
    topic: topic !== ResearchTopic.GENERAL ? topic : undefined,
    tags: [],
    notes: []
  }));
};

export const extractMetadataFromText = async (textSnippet: string): Promise<Partial<Paper>> => {
  return {
    title: "Imported Document",
    authors: ["Unknown Author"],
    year: new Date().getFullYear().toString(),
    abstract: "Metadata extraction requires manual entry for local files.",
    period: undefined,
    topic: undefined,
    language: isPersian(textSnippet) ? 'fa' : 'en',
    apiSource: 'Local'
  };
};
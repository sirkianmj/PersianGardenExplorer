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

// --- Real-Time Scrapers ---

/**
 * Scrapes NoorMags (Specialized Iranian Magazines)
 */
const fetchNoorMags = async (query: string): Promise<Partial<Paper>[]> => {
    try {
        const strictQuery = encodeURIComponent(query);
        const targetUrl = `https://www.noormags.ir/view/fa/search?q=${strictQuery}`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) return [];
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // NoorMags usually lists results in a list structure
        // We look for titles which are usually in anchor tags inside specific containers
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
 */
const fetchGanjoor = async (query: string): Promise<Partial<Paper>[]> => {
    try {
        const strictQuery = encodeURIComponent(query);
        const targetUrl = `https://ganjoor.net/?s=${strictQuery}`;
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
 */
const fetchSID = async (query: string): Promise<Partial<Paper>[]> => {
    try {
        const strictQuery = encodeURIComponent(query);
        // Using the general search endpoint
        const targetUrl = `https://www.sid.ir/fa/search/paper/paper?q=${strictQuery}`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) return [];
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // SID uses different link structures. We catch both standard paper links and viewpaper links.
        const links = Array.from(doc.querySelectorAll('a[href*="/paper/"], a[href*="ViewPaper"]'));
        
        const uniquePapers = new Map<string, Partial<Paper>>();

        links.forEach((link, index) => {
            const href = (link as HTMLAnchorElement).getAttribute('href');
            if (!href) return;
            
            const fullLink = href.startsWith('http') ? href : `https://www.sid.ir${href}`;
            const title = link.textContent?.trim();

            if (!title || title.length < 5 || title.includes("دانلود") || title.includes("PDF")) return;
            if (uniquePapers.has(fullLink)) return;

            // Attempt to find year in context
            const parentText = link.parentElement?.parentElement?.textContent || "";
            const yearMatch = parentText.match(/[1-4][0-9]{3}/); // Persian/Gregorian year rough match

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

const fetchSemanticScholar = async (query: string): Promise<Partial<Paper>[]> => {
  try {
    const targetUrl = `${SEMANTIC_SCHOLAR_BASE}?query=${encodeURIComponent(query)}&limit=8&fields=${SEMANTIC_FIELDS}`;
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

const fetchCrossRef = async (query: string): Promise<Partial<Paper>[]> => {
  try {
    const targetUrl = `${CROSSREF_BASE}?query.bibliographic=${encodeURIComponent(query)}&rows=10&sort=relevance`;
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
  
  const isQueryPersian = isPersian(query);
  let searchString = query;

  // If query is English, optimize for Global APIs
  if (!isQueryPersian) {
      searchString = `"${query}" AND ("Persian Garden" OR "Iranian Architecture" OR "Islamic Art")`;
  }
  
  // Append period if selected
  if (period && period !== HistoricalPeriod.ALL) {
      let periodTerm = period.toString();
      if (periodTerm.includes('&')) {
          periodTerm = periodTerm.split('&')[0].trim();
      }
      if (!searchString.includes(periodTerm)) {
          searchString += ` ${periodTerm}`;
      }
  }
  
  console.log(`Executing Search: [${searchString}]`);
  
  // Execute all fetches in parallel using Promise.allSettled to ensure one failure doesn't stop others
  const results = await Promise.allSettled([
      fetchSID(query),          // Persian
      fetchNoorMags(query),     // Persian
      fetchGanjoor(query),      // Persian
      fetchSemanticScholar(searchString), // Global
      fetchCrossRef(searchString)         // Global
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
      if(!uniqueMap.has(p.title)) {
          uniqueMap.set(p.title, p);
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
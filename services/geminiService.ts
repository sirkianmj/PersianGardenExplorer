import { Paper, HistoricalPeriod, ResearchTopic, ArtWork } from '../types';

// --- Configuration ---
// Using corsproxy.io to bypass CORS restrictions on Iranian academic sites
const CORS_PROXY = 'https://corsproxy.io/?'; 

const SEMANTIC_SCHOLAR_BASE = 'https://api.semanticscholar.org/graph/v1/paper/search';
const SEMANTIC_FIELDS = 'paperId,title,authors,year,abstract,venue,url,openAccessPdf';

const CROSSREF_BASE = 'https://api.crossref.org/works';

// Museum APIs
const MET_MUSEUM_SEARCH = 'https://collectionapi.metmuseum.org/public/collection/v1/search';
const MET_MUSEUM_OBJECT = 'https://collectionapi.metmuseum.org/public/collection/v1/objects';
const CLEVELAND_API = 'https://openaccess-api.clevelandart.org/api/artworks';
const CHICAGO_API = 'https://api.artic.edu/api/v1/artworks/search';
const CHICAGO_IIIF = 'https://www.artic.edu/iiif/2';

export const initializeGemini = (apiKey: string) => {
  console.log("Initialized Academic Services (Free Mode)");
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

// --- Keyword Mapping for Art Search ---
const PERSIAN_ART_TERMS: Record<string, string> = {
    'باغ': 'Garden',
    'فرش': 'Carpet',
    'قالی': 'Rug',
    'مینیاتور': 'Miniature Painting',
    'نگارگری': 'Illuminated Manuscript',
    'نقاشی': 'Painting',
    'کاشی': 'Tile',
    'سفال': 'Ceramic',
    'معماری': 'Architecture',
    'صفوی': 'Safavid',
    'تیموری': 'Timurid',
    'قاجار': 'Qajar',
    'زند': 'Zand',
    'ساسانی': 'Sasanian',
    'هخامنشی': 'Achaemenid',
    'شکار': 'Hunt',
    'گل': 'Flower',
    'بلبل': 'Bird',
    'کتاب': 'Book',
    'نسخه': 'Manuscript',
    'خط': 'Calligraphy',
    'تذهیب': 'Illumination',
    'فلز': 'Metalwork',
    'شاهنامه': 'Shahnama',
    'لیلی': 'Layla',
    'مجنون': 'Majnun',
    'خسرو': 'Khusrau',
    'شیرین': 'Shirin',
    'بهشت': 'Paradise'
};

const translateToEnglishArtTerm = (persianQuery: string): string => {
    let englishQuery = "";
    // Check for known terms
    Object.keys(PERSIAN_ART_TERMS).forEach(term => {
        if (persianQuery.includes(term)) {
            englishQuery += ` ${PERSIAN_ART_TERMS[term]}`;
        }
    });
    
    // Default fallback if translation yields nothing, but user typed Persian
    if (!englishQuery.trim()) {
        return "Persian Art"; 
    }
    
    return englishQuery.trim();
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

const fetchSemanticScholar = async (rawQuery: string): Promise<Partial<Paper>[]> => {
  try {
    let smartQuery = extractEnglishQuery(rawQuery);
    
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

// --- VISUAL ARCHIVE: Multi-Museum Search ---

// 1. Cleveland Museum of Art Fetcher
const fetchClevelandArt = async (smartQuery: string): Promise<ArtWork[]> => {
    try {
        // CMA handles boolean logic well. "Iran" usually gets better results than "Persian" for region.
        const q = `${smartQuery} (Iran OR Persian OR Islamic)`;
        const url = `${CLEVELAND_API}?q=${encodeURIComponent(q)}&has_image=1&limit=20`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        
        const res = await fetch(proxyUrl);
        const json = await res.json();
        
        if (!json.data) return [];
        
        return json.data.map((item: any) => ({
            id: `cma-${item.id}`,
            title: item.title,
            artist: item.creators?.[0]?.description || 'Unknown',
            period: item.culture?.[0] || 'Unknown',
            date: item.creation_date || '',
            imageUrl: item.images?.web?.url,
            highResUrl: item.images?.print?.url || item.images?.web?.url,
            museumUrl: item.url,
            department: item.department || 'Cleveland Museum of Art',
            medium: item.technique || ''
        } as ArtWork)).filter((art: ArtWork) => art.imageUrl);
        
    } catch (e) {
        console.warn("Cleveland API Error", e);
        return [];
    }
};

// 2. Art Institute of Chicago Fetcher
const fetchChicagoArt = async (smartQuery: string): Promise<ArtWork[]> => {
    try {
        const q = `${smartQuery} Persian`;
        const fields = 'id,title,image_id,artist_display,date_display,medium_display,place_of_origin';
        const url = `${CHICAGO_API}?q=${encodeURIComponent(q)}&query[term][is_public_domain]=true&limit=20&fields=${fields}`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        
        const res = await fetch(proxyUrl);
        const json = await res.json();
        
        if (!json.data) return [];
        
        return json.data.map((item: any) => {
            if (!item.image_id) return null;
            return {
                id: `aic-${item.id}`,
                title: item.title,
                artist: item.artist_display || 'Unknown',
                period: item.place_of_origin || 'Unknown',
                date: item.date_display || '',
                // Construct IIIF URL: {base}/{id}/full/{size}/0/default.jpg
                imageUrl: `${CHICAGO_IIIF}/${item.image_id}/full/400,/0/default.jpg`,
                highResUrl: `${CHICAGO_IIIF}/${item.image_id}/full/843,/0/default.jpg`,
                museumUrl: `https://www.artic.edu/artworks/${item.id}`,
                department: 'Art Institute of Chicago',
                medium: item.medium_display || ''
            } as ArtWork;
        }).filter(Boolean) as ArtWork[];
    } catch (e) {
        console.warn("Chicago API Error", e);
        return [];
    }
};

// 3. Met Museum Fetcher
const fetchMetMuseum = async (smartQuery: string): Promise<ArtWork[]> => {
    try {
        const q = `${smartQuery} Persian`;
        // Search first to get object IDs
        const searchUrl = `${MET_MUSEUM_SEARCH}?q=${encodeURIComponent(q)}&hasImages=true`;
        const proxySearch = `${CORS_PROXY}${encodeURIComponent(searchUrl)}`;
        
        const searchRes = await fetch(proxySearch);
        const searchJson = await searchRes.json();
        
        if (!searchJson.objectIDs || searchJson.objectIDs.length === 0) return [];

        // Take top 8 results to avoid rate limits
        const topIds = searchJson.objectIDs.slice(0, 8);
        
        // Fetch details in parallel
        const artworks = await Promise.all(topIds.map(async (id: number) => {
            try {
                const objUrl = `${MET_MUSEUM_OBJECT}/${id}`;
                const proxyObj = `${CORS_PROXY}${encodeURIComponent(objUrl)}`;
                const objRes = await fetch(proxyObj);
                const obj = await objRes.json();
                
                if (!obj.primaryImageSmall) return null;

                return {
                    id: `met-${obj.objectID}`,
                    title: obj.title,
                    artist: obj.artistDisplayName || 'Unknown',
                    period: obj.period || obj.dynasty || 'Unknown',
                    date: obj.objectDate || '',
                    imageUrl: obj.primaryImageSmall,
                    highResUrl: obj.primaryImage,
                    museumUrl: obj.objectURL,
                    department: 'Metropolitan Museum of Art',
                    medium: obj.medium || ''
                } as ArtWork;
            } catch (e) {
                return null;
            }
        }));

        return artworks.filter(Boolean) as ArtWork[];

    } catch (e) {
        console.warn("Met Museum API Error", e);
        return [];
    }
};

export const searchAcademicPapers = async (query: string, period: HistoricalPeriod, topic: ResearchTopic): Promise<Partial<Paper>[]> => {
  console.log(`Searching for: ${query}, Period: ${period}, Topic: ${topic}`);

  // Parallel Execution of all Free Sources
  const [semanticResults, crossrefResults, sidResults, noorResults, ganjoorResults] = await Promise.all([
    fetchSemanticScholar(query),
    fetchCrossRef(query),
    fetchSID(query),
    fetchNoorMags(query),
    fetchGanjoor(query)
  ]);

  // Merge and Deduplicate (by Title roughly)
  const all = [...sidResults, ...noorResults, ...ganjoorResults, ...semanticResults, ...crossrefResults];
  const unique = new Map();
  
  all.forEach(p => {
      const key = p.title?.toLowerCase().trim();
      if (!unique.has(key)) {
          unique.set(key, p);
      }
  });

  return Array.from(unique.values());
};

export const searchPersianArt = async (query: string): Promise<ArtWork[]> => {
    console.log(`Searching Art for: ${query}`);
    
    // Convert Persian query to English terms for International Museums
    const englishQuery = isPersian(query) ? translateToEnglishArtTerm(query) : query;
    
    // Parallel fetch from museums
    const [cleveland, chicago, met] = await Promise.all([
        fetchClevelandArt(englishQuery),
        fetchChicagoArt(englishQuery),
        fetchMetMuseum(englishQuery)
    ]);
    
    return [...met, ...cleveland, ...chicago];
};
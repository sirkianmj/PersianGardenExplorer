// Developed by Kian Mansouri Jamshidi
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

// Ganjoor API
const GANJOOR_API_BASE = 'https://api.ganjoor.net/api/ganjoor/poem/search';

export const initializeGemini = (apiKey: string) => {
  console.log("Initialized Academic Services (Free Mode)");
};

export const isGeminiInitialized = (): boolean => {
  return true;
};

// --- KEYWORD MAPPINGS (Dual Language) ---

const PERIOD_TERMS: Record<HistoricalPeriod, {en: string, fa: string}> = {
    [HistoricalPeriod.ALL]: {en: "", fa: ""},
    [HistoricalPeriod.ELAMITE_MEDES]: {en: "Elamite Medes", fa: "ایلام ماد"},
    [HistoricalPeriod.ACHAEMENID]: {en: "Achaemenid", fa: "هخامنشی"},
    [HistoricalPeriod.SELEUCID_PARTHIAN]: {en: "Seleucid Parthian", fa: "سلوکی اشکانی"},
    [HistoricalPeriod.SASSANID]: {en: "Sassanid", fa: "ساسانی"},
    [HistoricalPeriod.EARLY_ISLAMIC]: {en: "Early Islamic Persia", fa: "اسلامی اولیه"},
    [HistoricalPeriod.SELJUK_GHAZNAVID]: {en: "Seljuk Ghaznavid", fa: "سلجوقی غزنوی"},
    [HistoricalPeriod.ILKHANID]: {en: "Ilkhanid", fa: "ایلخانی"},
    [HistoricalPeriod.TIMURID]: {en: "Timurid", fa: "تیموری"},
    [HistoricalPeriod.SAFAVID]: {en: "Safavid", fa: "صفوی"},
    [HistoricalPeriod.AFSHARID_ZAND]: {en: "Afsharid Zand", fa: "افشار زند"},
    [HistoricalPeriod.QAJAR]: {en: "Qajar", fa: "قاجار"},
    [HistoricalPeriod.PAHLAVI]: {en: "Pahlavi", fa: "پهلوی"},
    [HistoricalPeriod.CONTEMPORARY]: {en: "Contemporary Iran", fa: "معاصر ایران"}
};

const TOPIC_TERMS: Record<ResearchTopic, {en: string, fa: string}> = {
    [ResearchTopic.GENERAL]: {en: "History", fa: "تاریخ"},
    [ResearchTopic.GARDEN_LAYOUT]: {en: "Garden Plan", fa: "هندسه باغ"},
    [ResearchTopic.QANAT_WATER]: {en: "Qanat Water", fa: "قنات آبیاری"},
    [ResearchTopic.VEGETATION]: {en: "Vegetation Trees", fa: "گیاهان درختان"},
    [ResearchTopic.SYMBOLISM]: {en: "Symbolism Mysticism", fa: "نمادشناسی عرفان"},
    [ResearchTopic.PAVILIONS]: {en: "Pavilion Palace", fa: "کوشک عمارت"},
    [ResearchTopic.CONSERVATION]: {en: "Conservation Heritage", fa: "مرمت میراث"}
};

// Reduced keywords to prevent search engines from returning 0 results due to "AND" logic over-specificity
const FORCE_GARDEN_TERMS = {
    en: "Persian Garden",
    fa: "باغ ایرانی"
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

const translateToEnglishArtTerm = (persianQuery: string): string => {
    // Basic translation map for Art specific terms
    const artMap: Record<string, string> = {
        'باغ': 'Garden', 'فرش': 'Carpet', 'قالی': 'Rug', 'مینیاتور': 'Miniature Painting',
        'نگارگری': 'Illuminated Manuscript', 'نقاشی': 'Painting', 'کاشی': 'Tile', 'سفال': 'Ceramic',
        'معماری': 'Architecture', 'صفوی': 'Safavid', 'تیموری': 'Timurid', 'قاجار': 'Qajar',
        'گل': 'Flower', 'بلبل': 'Bird', 'کتاب': 'Book', 'نسخه': 'Manuscript', 'خط': 'Calligraphy'
    };
    
    let englishTerms: string[] = [];
    Object.keys(artMap).forEach(term => {
        if (persianQuery.includes(term)) englishTerms.push(artMap[term]);
    });
    
    // If no specific terms found, but input is Persian, return general term
    if (englishTerms.length === 0 && isPersian(persianQuery)) return "Persian Art";
    
    return englishTerms.join(' ');
};

const translateToPersianLiteratureTerm = (query: string): string => {
    const map: Record<string, string> = {
        'garden': 'باغ',
        'flower': 'گل',
        'wine': 'می',
        'love': 'عشق',
        'nightingale': 'بلبل',
        'rose': 'گل سرخ',
        'paradise': 'بهشت',
        'water': 'آب',
        'cypress': 'سرو',
        'fountain': 'فواره',
        'pavilion': 'کوشک',
        'desert': 'بیابان',
        'hafez': 'حافظ',
        'saadi': 'سعدی',
        'rumi': 'مولوی',
        'ferdowsi': 'فردوسی',
        'khayyam': 'خیام',
        'poetry': 'شعر',
        'poem': 'شعر'
    };
    
    let q = query.toLowerCase();
    
    // Replace known terms
    Object.keys(map).forEach(key => {
        if (q.includes(key)) {
            q = q.replace(key, map[key]);
        }
    });
    
    return q;
};

/**
 * STRATEGY: Intelligent Query Sanitization
 */

// Extracts only Persian text and numbers, removes booleans/punctuation
const extractPersianQuery = (query: string): string => {
  let clean = query.replace(/\b(OR|AND|NOT)\b/gi, ' ');
  return clean.replace(/[^\u0600-\u06FF\s0-9]/g, '').replace(/\s+/g, ' ').trim();
};

// Extracts only English text, removes booleans/punctuation
const extractEnglishQuery = (query: string): string => {
   let clean = query.replace(/\b(OR|AND|NOT)\b/gi, ' ');
   return clean.replace(/[\u0600-\u06FF]/g, '').replace(/[()"]/g, '').replace(/\s+/g, ' ').trim();
};

// Removes Booleans and Parentheses but keeps both languages
const cleanMixedQuery = (query: string): string => {
    return query.replace(/\b(OR|AND|NOT)\b/gi, ' ').replace(/[()"]/g, '').replace(/\s+/g, ' ').trim();
};

// --- Real-Time Scrapers ---

const fetchNoorMags = async (augmentedQuery: string): Promise<Partial<Paper>[]> => {
    try {
        const smartQuery = extractPersianQuery(augmentedQuery);
        if (smartQuery.length < 2) return []; 

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
    } catch (e) { console.warn("NoorMags scrape warning:", e); return []; }
};

const fetchGanjoor = async (augmentedQuery: string): Promise<Partial<Paper>[]> => {
    try {
        // Use cleanMixedQuery to allow English input (which we likely translated)
        let smartQuery = cleanMixedQuery(augmentedQuery);
        
        // If query is purely English and not empty, try a naive translation if it wasn't already handled
        if (!isPersian(smartQuery) && smartQuery.trim().length > 0) {
            smartQuery = translateToPersianLiteratureTerm(smartQuery);
        }
        
        if (smartQuery.trim().length < 2) return [];

        console.log(`Ganjoor Fetching for: ${smartQuery}`);

        // STRATEGY 1: Official API (Priority)
        const encodedQuery = encodeURIComponent(smartQuery);
        const apiUrl = `${GANJOOR_API_BASE}?term=${encodedQuery}&catId=0&pageNumber=1&pageSize=12`;
        // We use corsproxy to handle headers
        const proxyApiUrl = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`;

        try {
            const response = await fetch(proxyApiUrl);
            if (response.ok) {
                const json = await response.json();
                // Check if result is array (common for list endpoints) or wrapped
                const items = Array.isArray(json) ? json : (json.poems || []);
                
                if (items.length > 0) {
                    return items.map((item: any, index: number) => ({
                        id: `ganjoor-api-${item.id || index}-${Date.now()}`,
                        title: `${item.poetName || ''} - ${item.title || 'Untitled'}`,
                        authors: [item.poetName || 'Ganjoor Poet'],
                        year: 'Classic',
                        source: 'Ganjoor (API)',
                        abstract: item.plainText ? item.plainText.substring(0, 300) + '...' : 'متن شعر در دسترس نیست',
                        url: `https://ganjoor.net${item.url || ''}`,
                        isLocal: false,
                        addedAt: Date.now(),
                        language: 'fa',
                        apiSource: 'Ganjoor'
                    }));
                }
            }
        } catch (apiError) {
            console.warn("Ganjoor API failed, falling back to specific scrape", apiError);
        }

        // STRATEGY 2: Specific HTML Scraping (Fallback)
        // NOT general scraping. Only look for strict search result classes.
        // Prevents "random poem" or "featured" links from appearing.
        
        // Note: Ganjoor's old search endpoint sometimes returns HTML results
        const targetUrl = `https://ganjoor.net/?s=${encodedQuery}`;
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) return [];
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // STRICT selectors for search results only
        const searchItems = Array.from(doc.querySelectorAll('.search-result, .archive-item, .post-summary'));
        
        if (searchItems.length === 0) {
             // If no strict search results, DO NOT fall back to 'a' tags.
             // It is better to return 0 results than wrong results.
             return [];
        }

        const results: Partial<Paper>[] = [];

        searchItems.forEach((item, index) => {
            const link = item.querySelector('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;
            const fullUrl = href.startsWith('http') ? href : `https://ganjoor.net${href}`;
            const title = link.textContent?.trim() || 'Untitled Poem';

            // Try to find excerpt
            const excerptEl = item.querySelector('.excerpt, .entry-summary, p');
            const abstract = excerptEl ? excerptEl.textContent?.trim().substring(0, 200) + '...' : '...';

            results.push({
                id: `ganjoor-scrape-${index}-${Date.now()}`,
                title: title,
                authors: ['Ganjoor'],
                year: 'Classic',
                source: 'Ganjoor (Web)',
                abstract: abstract,
                url: fullUrl,
                isLocal: false,
                addedAt: Date.now(),
                language: 'fa',
                apiSource: 'Ganjoor'
            });
        });
        
        return results;

    } catch (e) { 
        console.warn("Ganjoor scrape warning:", e); 
        return []; 
    }
};

const fetchSID = async (augmentedQuery: string): Promise<Partial<Paper>[]> => {
    try {
        // Prefer pure persian if available in query for better SID results
        let smartQuery = "";
        if (PERSIAN_REGEX.test(augmentedQuery)) {
            smartQuery = extractPersianQuery(augmentedQuery);
        } else {
            smartQuery = cleanMixedQuery(augmentedQuery);
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
    } catch (e) { console.warn("SID scrape warning:", e); return []; }
};

const fetchSemanticScholar = async (augmentedQuery: string): Promise<Partial<Paper>[]> => {
  try {
    let smartQuery = extractEnglishQuery(augmentedQuery);
    if (smartQuery.length < 3) smartQuery = cleanMixedQuery(augmentedQuery);

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
  } catch (error) { console.warn("Semantic fetch error", error); return []; }
};

const fetchCrossRef = async (augmentedQuery: string): Promise<Partial<Paper>[]> => {
  try {
    let smartQuery = extractEnglishQuery(augmentedQuery);
    if (smartQuery.length < 3) smartQuery = cleanMixedQuery(augmentedQuery);

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
  } catch (error) { console.warn("CrossRef error", error); return []; }
};

// --- VISUAL ARCHIVE: Multi-Museum Search ---

const fetchClevelandArt = async (smartQuery: string): Promise<ArtWork[]> => {
    try {
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
    } catch (e) { return []; }
};

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
                imageUrl: `${CHICAGO_IIIF}/${item.image_id}/full/400,/0/default.jpg`,
                highResUrl: `${CHICAGO_IIIF}/${item.image_id}/full/843,/0/default.jpg`,
                museumUrl: `https://www.artic.edu/artworks/${item.id}`,
                department: 'Art Institute of Chicago',
                medium: item.medium_display || ''
            } as ArtWork;
        }).filter(Boolean) as ArtWork[];
    } catch (e) { return []; }
};

const fetchMetMuseum = async (smartQuery: string): Promise<ArtWork[]> => {
    try {
        const q = `${smartQuery} Persian`;
        const searchUrl = `${MET_MUSEUM_SEARCH}?q=${encodeURIComponent(q)}&hasImages=true`;
        const proxySearch = `${CORS_PROXY}${encodeURIComponent(searchUrl)}`;
        const searchRes = await fetch(proxySearch);
        const searchJson = await searchRes.json();
        if (!searchJson.objectIDs || searchJson.objectIDs.length === 0) return [];
        const topIds = searchJson.objectIDs.slice(0, 8);
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
            } catch (e) { return null; }
        }));
        return artworks.filter(Boolean) as ArtWork[];
    } catch (e) { return []; }
};

// --- MAIN SEARCH FUNCTIONS ---

export const searchAcademicPapers = async (
  query: string, 
  period: HistoricalPeriod, 
  topic: ResearchTopic,
  forceGardenContext: boolean
): Promise<Partial<Paper>[]> => {
  
  // 1. Construct the Augmented Query
  let augmentedQuery = query;

  // Add Dynasty / Period Filters (Both EN and FA)
  if (period !== HistoricalPeriod.ALL && PERIOD_TERMS[period]) {
      const p = PERIOD_TERMS[period];
      augmentedQuery += ` ${p.en} ${p.fa}`;
  }

  // Add Topic Filters (Both EN and FA)
  if (topic !== ResearchTopic.GENERAL && TOPIC_TERMS[topic]) {
      const t = TOPIC_TERMS[topic];
      augmentedQuery += ` ${t.en} ${t.fa}`;
  }

  // Add Force Garden Context
  if (forceGardenContext) {
      augmentedQuery += ` ${FORCE_GARDEN_TERMS.en} ${FORCE_GARDEN_TERMS.fa}`;
  }

  console.log(`Executing Augmented Search: "${augmentedQuery}"`);

  // 2. Parallel Execution of all Free Sources
  // NOTE: Ganjoor removed from here, now in searchLiterature
  const [semanticResults, crossrefResults, sidResults, noorResults] = await Promise.all([
    fetchSemanticScholar(augmentedQuery),
    fetchCrossRef(augmentedQuery),
    fetchSID(augmentedQuery),
    fetchNoorMags(augmentedQuery)
  ]);

  // 3. Merge and Deduplicate
  const all = [...sidResults, ...noorResults, ...semanticResults, ...crossrefResults];
  const unique = new Map();
  all.forEach(p => {
      const key = p.title?.toLowerCase().trim();
      if (!unique.has(key)) {
          unique.set(key, p);
      }
  });

  return Array.from(unique.values());
};

export const searchPersianArt = async (query: string, period: HistoricalPeriod, forceGardenContext: boolean): Promise<ArtWork[]> => {
    
    // Construct Art-Specific Query
    let artQuery = query;
    
    // Convert base query if it's purely Persian
    if (isPersian(query)) {
        artQuery += " " + translateToEnglishArtTerm(query);
    }

    if (period !== HistoricalPeriod.ALL && PERIOD_TERMS[period]) {
        artQuery += ` ${PERIOD_TERMS[period].en}`; // Museums are mostly English indexed
    }

    if (forceGardenContext) {
        artQuery += ` Garden Landscape`;
    }

    console.log(`Searching Art for: ${artQuery}`);
    
    // Parallel fetch
    const [cleveland, chicago, met] = await Promise.all([
        fetchClevelandArt(artQuery),
        fetchChicagoArt(artQuery),
        fetchMetMuseum(artQuery)
    ]);
    
    return [...met, ...cleveland, ...chicago];
};

export const searchLiterature = async (query: string, forceGardenContext: boolean): Promise<Partial<Paper>[]> => {
    let q = query;
    
    // For literature, if context is forced, we might want to add poetic terms
    // But ONLY if the query is in Persian. If it's English, we rely on translateToPersianLiteratureTerm in fetchGanjoor
    if (forceGardenContext && isPersian(q)) {
        // Appending 'garden' terms if they aren't already there
        if (!q.includes('باغ') && !q.includes('گل')) {
            q += " باغ گل"; 
        }
    }
    // If it's English, we pass it raw, and fetchGanjoor will translate it.
    
    console.log(`Searching Literature for: ${q}`);
    return fetchGanjoor(q);
};
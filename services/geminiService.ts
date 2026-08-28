// Developed by Kian Mansouri Jamshidi
import { Paper, HistoricalPeriod, ResearchTopic, ArtWork } from '../types';
import { PERSIAN_ART_ARCHIVE } from '../data/persianArtArchive';

// --- Configuration ---
// Using corsproxy.io to bypass CORS restrictions on Iranian academic sites
const CORS_PROXY = 'https://corsproxy.io/?'; 

const SEMANTIC_SCHOLAR_BASE = 'https://api.semanticscholar.org/graph/v1/paper/search';
const SEMANTIC_FIELDS = 'paperId,title,authors,year,abstract,venue,url,openAccessPdf';

const CROSSREF_BASE = 'https://api.crossref.org/works';

// Museum APIs (Open Access with CORS support)
const MET_MUSEUM_SEARCH = 'https://collectionapi.metmuseum.org/public/collection/v1/search';
const MET_MUSEUM_OBJECT = 'https://collectionapi.metmuseum.org/public/collection/v1/objects';
const CLEVELAND_API = 'https://openaccess-api.clevelandart.org/api/artworks';

// Resilient fetch with strict timeout to prevent infinite loading
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 4500): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        return res;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
};

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

const translateToEnglishArtTerm = (rawQuery: string): string => {
    if (!rawQuery || typeof rawQuery !== 'string') return "Persian art";
    const q = rawQuery.trim().toLowerCase();

    // If already in English or mostly English
    if (!isPersian(q) && q.length > 1) {
        return q;
    }

    const artMap: Record<string, string> = {
        // Ancient Civilizations & Pre-Islamic Iran
        'ایلام': 'Elamite',
        'عیلام': 'Elamite',
        'ایلامی': 'Elamite',
        'عیلامی': 'Elamite',
        'چغازنبیل': 'Chogha Zanbil',
        'چغا زنبیل': 'Chogha Zanbil',
        'دور اونتاش': 'Chogha Zanbil Dur-Untash',
        'شوش': 'Susa Elamite',
        'ناپیرآسو': 'Napir-Asu Elamite',
        'ناپیر اسو': 'Napir-Asu Elamite',
        'اینشوشیناک': 'Inshushinak Elamite',
        'اونتاش': 'Untash Elamite',
        'مفرغ لرستان': 'Luristan Bronze',
        'برنز لرستان': 'Luristan Bronze',
        'لرستان': 'Luristan Bronze',
        'سیلک': 'Tepe Sialk',
        'تپه سیلک': 'Tepe Sialk',
        'مارلیک': 'Marlik Gold',
        'حسنلو': 'Hasanlu Gold',
        'جام حسنلو': 'Golden Bowl Hasanlu',
        'جیرفت': 'Jiroft',
        'ماد': 'Median',
        'مادی': 'Median',
        'مادها': 'Median',
        'هخامنشی': 'Achaemenid',
        'هخامنشیان': 'Achaemenid',
        'پارسه': 'Persepolis',
        'تخت جمشید': 'Persepolis Achaemenid',
        'پرسپولیس': 'Persepolis',
        'پاسارگاد': 'Pasargadae Achaemenid',
        'کوروش': 'Cyrus Achaemenid',
        'داریوش': 'Darius Achaemenid',
        'خشایارشا': 'Xerxes Achaemenid',
        'سلوکی': 'Seleucid',
        'سلوکیان': 'Seleucid',
        'اشکانی': 'Parthian',
        'اشکانیان': 'Parthian',
        'پارتی': 'Parthian',
        'ساسانی': 'Sasanian',
        'ساسانیان': 'Sasanian',
        'طاق بستان': 'Taq-e Bostan Sasanian',
        'طاقبستان': 'Taq-e Bostan Sasanian',
        'نقش رستم': 'Naqsh-e Rustam',
        'نقش رجب': 'Naqsh-e Rajab',
        'بیشاپور': 'Bishapur Sasanian',

        // Dynasties & Eras (Islamic Period)
        'صفوی': 'Safavid',
        'صفویه': 'Safavid',
        'قاجار': 'Qajar',
        'قاجاری': 'Qajar',
        'قاجاریه': 'Qajar',
        'تیموری': 'Timurid',
        'تیموریان': 'Timurid',
        'ایلخانی': 'Ilkhanid',
        'ایلخانان': 'Ilkhanid',
        'سلجوقی': 'Seljuk',
        'سلجوقیان': 'Seljuk',
        'افشار': 'Afsharid',
        'افشاریه': 'Afsharid',
        'زند': 'Zand',
        'زندیه': 'Zand',
        'سامانی': 'Samanid',
        'غزنوی': 'Ghaznavid',
        'مغول': 'Mughal Persian',

        // Literature, Epics & Manuscripts
        'شاهنامه': 'Shahnameh',
        'فردوسی': 'Ferdowsi Shahnameh',
        'خمسه': 'Khamsa Nizami',
        'نظامی': 'Nizami Ganjavi',
        'هفت پیکر': 'Haft Paykar',
        'خسرو و شیرین': 'Khosrow Shirin',
        'لیلی و مجنون': 'Layla Majnun',
        'منطق الطیر': 'Mantiq al-Tayr Attar',
        'عطار': 'Attar',
        'گلستان': 'Gulistan Saadi',
        'بوستان': 'Bustan Saadi',
        'سعدی': 'Saadi',
        'حافظ': 'Hafez Divan',
        'خیام': 'Khayyam',
        'جامی': 'Jami Haft Awrang',
        'هفت اورنگ': 'Haft Awrang',
        'کلیله و دمنه': 'Kalila wa Dimna',

        // Masters & Artists
        'بهزاد': 'Kamal al-Din Behzad',
        'کمال الدین بهزاد': 'Kamal al-Din Behzad',
        'رضا عباسی': 'Reza Abbasi',
        'عباسی': 'Reza Abbasi',
        'سلطان محمد': 'Sultan Muhammad',
        'میرک': 'Aqa Mirak',
        'آقا میرک': 'Aqa Mirak',
        'میر مصور': 'Mir Musavvir',
        'معین مصور': 'Muin Musavvir',
        'کمال الملک': 'Kamal-ol-Molk',
        'صنیع الملک': 'Sani-ol-Molk',
        'مهرعلی': 'Mihr Ali Qajar',
        'حبیب الله': 'Habiballah',
        'میرعلی هروی': 'Mir Ali Haravi',
        'فرشچیان': 'Farshchian',

        // Themes, Figures & Myth
        'معراج': 'Miraj Prophet ascension',
        'رستم': 'Rustam Rostam',
        'سهراب': 'Sohrab',
        'اسفندیار': 'Isfandiyar',
        'کیومرث': 'Gayumars Kayumars',
        'اسکندر': 'Iskandar Alexander',
        'بهرام': 'Bahram Gur',
        'بهرام گور': 'Bahram Gur',
        'شیرین': 'Shirin',
        'خسرو': 'Khosrow',
        'دیو': 'Div demon',
        'دیو سپید': 'White Div',
        'بزم': 'Feast Banquet',
        'رزم': 'Battle Fight',
        'نبرد': 'Battle',
        'شکار': 'Hunting Hunt',
        'شکارگاه': 'Hunting Scene',
        'چوگان': 'Polo game',
        'عاشق': 'Lovers',
        'دلداده': 'Lovers',
        'درویش': 'Dervish Sufi',
        'صوفی': 'Sufi Dervish',
        'شاه': 'Shah King Prince',
        'پادشاه': 'Shah King',
        'ساقی': 'Cupbearer',
        'مطرب': 'Musician',
        'نوازنده': 'Musician',

        // Garden, Architecture & Nature
        'باغ': 'Garden',
        'پردیس': 'Paradise Garden',
        'چهارباغ': 'Chaharbagh Garden',
        'گل و بلبل': 'Rose and Nightingale Gol o Bolbol',
        'گل': 'Flower Rose',
        'بلبل': 'Nightingale',
        'سرو': 'Cypress tree',
        'چنار': 'Plane tree',
        'حوض': 'Pool Fountain',
        'استخر': 'Pool basin',
        'فواره': 'Fountain',
        'کوشک': 'Pavilion Palace',
        'عمارت': 'Palace Pavilion',
        'طاووس': 'Peacock',
        'باز': 'Falcon',
        'شاهین': 'Falcon',
        'اسب': 'Horse Stallion',
        'رخش': 'Rakhsh horse',
        'شیر': 'Lion',
        'پلنگ': 'Leopard',
        'غزال': 'Gazelle deer',
        'آهو': 'Gazelle deer',
        'سیمرغ': 'Simurgh',
        'اژدها': 'Dragon',
        'درخت': 'Tree',
        'شکوفه': 'Blossom blossom tree',
        'بز کوهی': 'Ibex',

        // Mediums & Decorative Arts
        'نگارگری': 'Miniature Painting',
        'مینیاتور': 'Miniature',
        'نقاشی': 'Painting',
        'پرتره': 'Portrait',
        'تذهیب': 'Illuminated Manuscript',
        'تشعیر': 'Marginal illumination',
        'خط': 'Calligraphy',
        'خوشنویسی': 'Calligraphy',
        'نستعلیق': 'Nastaliq Calligraphy',
        'کوفی': 'Kufic Calligraphy',
        'میخی': 'Cuneiform',
        'کتیبه': 'Inscription',
        'تندیس': 'Statue Sculpture',
        'مجسمه': 'Statue',
        'پیکره': 'Sculpture',
        'فرش': 'Carpet Rug',
        'قالی': 'Carpet Rug',
        'قالیچه': 'Rug',
        'کاشی': 'Tile Tilework',
        'کاشی کاری': 'Tile mosaic',
        'سفال': 'Ceramic Pottery',
        'سرامیک': 'Ceramic',
        'زرین فام': 'Luster Lusterware',
        'میناکاری': 'Enamel',
        'فلزکاری': 'Metalwork',
        'مفرغ': 'Bronze',
        'برنز': 'Bronze',
        'طلا': 'Gold',
        'نقره': 'Silver',
        'جام': 'Cup Bowl Vessel',
        'کاسه': 'Bowl',
        'محراب': 'Mihrab prayer niche',
        'قلمدان': 'Pen box Lacquer',
        'لاکی': 'Lacquer',
        'فرسکو': 'Fresco Wall Painting',
        'دیوارنگاره': 'Mural Wall Painting',

        // Cities & Monuments
        'اصفهان': 'Isfahan',
        'اسپهان': 'Isfahan',
        'شیراز': 'Shiraz',
        'کاشان': 'Kashan',
        'تبریز': 'Tabriz',
        'هرات': 'Herat',
        'یزد': 'Yazd',
        'قزوین': 'Qazvin',
        'نیشابور': 'Nishapur',
        'مشهد': 'Mashhad',
        'خراسان': 'Khorasan',
        'تهران': 'Tehran',
        'چهلستون': 'Chehel Sotoun Isfahan',
        'چهل ستون': 'Chehel Sotoun Isfahan',
        'هشت بهشت': 'Hasht Behesht',
        'کاخ گلستان': 'Golestan Palace Tehran',
        'عالی قاپو': 'Ali Qapu Isfahan',
        'فین': 'Fin Garden Kashan',
        'ارم': 'Eram Garden Shiraz'
    };

    const matchedEnglishTerms: string[] = [];
    const lowerQuery = q.toLowerCase();

    for (const [faKey, enVal] of Object.entries(artMap)) {
        if (lowerQuery.includes(faKey)) {
            matchedEnglishTerms.push(enVal);
        }
    }

    if (matchedEnglishTerms.length > 0) {
        // De-duplicate terms
        const uniqueTerms = Array.from(new Set(matchedEnglishTerms.join(' ').split(/\s+/)));
        const combined = uniqueTerms.join(' ');
        
        // If already includes specific culture/site name, return directly
        const isAncientOrSpecific = /Elamite|Chogha|Susa|Luristan|Achaemenid|Sasanian|Parthian|Median|Jiroft|Sialk|Marlik|Hasanlu|Persepolis|Pasargadae/i.test(combined);
        return isAncientOrSpecific ? combined : `Persian ${combined}`;
    }

    // Fallback translation attempt
    return extractPersianQuery(q);
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

        const response = await fetchWithTimeout(proxyUrl, {}, 3500);
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
        const response = await fetchWithTimeout(proxyUrl, {}, 3500);
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
    
    const response = await fetchWithTimeout(proxyUrl, {}, 3500);
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
    const response = await fetchWithTimeout(targetUrl, {}, 3500);
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

// --- VISUAL ARCHIVE: Multi-Museum & Cleveland/Met/Wikimedia Open Access Search ---

const WIKIMEDIA_COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

const fetchWikimediaArt = async (smartQuery: string): Promise<ArtWork[]> => {
    try {
        const queryTerm = smartQuery.trim();
        if (!queryTerm) return [];
        const url = `${WIKIMEDIA_COMMONS_API}?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(queryTerm)}&prop=imageinfo&iiprop=url|extmetadata|dimensions&iiurlwidth=800`;

        const res = await fetchWithTimeout(url, {
            headers: { 'User-Agent': 'PardisScholar/1.0 (kianmj18@gmail.com) ResearchApp/1.0' }
        }, 4000);
        if (!res.ok) return [];
        const json = await res.json();
        if (!json.query || !json.query.pages) return [];

        const pages = Object.values(json.query.pages) as any[];
        const validArt: ArtWork[] = [];

        for (const page of pages) {
            const info = page.imageinfo?.[0];
            if (!info || !info.thumburl) continue;

            const filename = page.title ? page.title.replace(/^File:/i, '') : 'نگاره تاریخی ایرانی';
            // Skip .svg maps or diagrams if not aesthetic artwork
            if (filename.toLowerCase().endsWith('.svg')) continue;

            const isPdf = filename.toLowerCase().endsWith('.pdf') || (info.url && info.url.toLowerCase().endsWith('.pdf')) || info.mime === 'application/pdf';
            const cleanTitle = filename.replace(/\.(jpg|jpeg|png|webp|tif|tiff|pdf)$/i, '').replace(/_/g, ' ');
            
            const ext = info.extmetadata || {};
            const artistRaw = ext.Artist?.value ? ext.Artist.value.replace(/<[^>]*>?/gm, '').trim() : 'هنرمند ایرانی / مکتب نگارگری و باستان';
            const dateRaw = ext.DateTimeOriginal?.value || ext.DateTime?.value || 'تاریخی';
            const descRaw = ext.ImageDescription?.value ? ext.ImageDescription.value.replace(/<[^>]*>?/gm, '').trim().substring(0, 300) : '';

            validArt.push({
                id: `wiki-${page.pageid || Math.random().toString(36).substring(2, 9)}`,
                title: cleanTitle,
                artist: artistRaw.length > 60 ? artistRaw.substring(0, 60) + '...' : artistRaw,
                period: isPdf ? 'سند و نسخه خطی / کتاب تاریخی' : 'میراث فرهنگی و تاریخ هنر ایران',
                date: String(dateRaw).substring(0, 25),
                imageUrl: info.thumburl,
                highResUrl: info.url || info.thumburl,
                museumUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
                department: isPdf ? 'آرشیو اسناد و کتب دیجیتال (ویکی‌انبار)' : 'ویکی‌انبار میراث فرهنگی (Wikimedia Commons)',
                medium: isPdf ? 'سند دیجیتال / نسخه خطی (PDF)' : 'اثر موزه‌ای / نگاره تاریخی',
                description: descRaw,
                isPdf: isPdf,
                pdfUrl: isPdf ? info.url : undefined
            });
        }

        return validArt;
    } catch (e) {
        return [];
    }
};

const fetchClevelandArt = async (smartQuery: string): Promise<ArtWork[]> => {
    try {
        const cleanQ = extractEnglishQuery(smartQuery) || "Persian art";
        const url = `${CLEVELAND_API}/?q=${encodeURIComponent(cleanQ)}&has_image=1&limit=15`;
        const res = await fetchWithTimeout(url, {}, 4000);
        if (!res.ok) return [];
        const json = await res.json();
        if (!json.data || !Array.isArray(json.data)) return [];
        
        return json.data.map((item: any) => ({
            id: `cma-${item.id}`,
            title: item.title || 'شاهکار هنر ایرانی',
            artist: item.creators?.[0]?.description || 'هنرمند ایرانی',
            period: item.culture?.[0] || 'هنر دوران تاریخی ایران',
            date: item.creation_date || 'تاریخی',
            imageUrl: item.images?.web?.url || item.images?.print?.url,
            highResUrl: item.images?.print?.url || item.images?.web?.url,
            museumUrl: item.url || `https://www.clevelandart.org/art/${item.id}`,
            department: item.department || 'موزه هنر کلیولند (Cleveland Museum of Art)',
            medium: item.technique || 'آبرنگ مات و طلا روی کاغذ',
            description: item.tombstone || item.wall_description || ''
        } as ArtWork)).filter((art: ArtWork) => Boolean(art.imageUrl));
    } catch (e) { 
        return []; 
    }
};

const fetchMetMuseum = async (smartQuery: string): Promise<ArtWork[]> => {
    try {
        const cleanQ = extractEnglishQuery(smartQuery) || "Persian art";
        const searchUrl = `${MET_MUSEUM_SEARCH}?q=${encodeURIComponent(cleanQ)}&hasImages=true`;
        const searchRes = await fetchWithTimeout(searchUrl, {}, 3500);
        if (!searchRes.ok) return [];
        
        let searchJson: any;
        try {
            searchJson = await searchRes.json();
        } catch {
            return [];
        }

        if (!searchJson || !searchJson.objectIDs || searchJson.objectIDs.length === 0) return [];
        
        const topIds = searchJson.objectIDs.slice(0, 10);
        const qTerms = cleanQ.toLowerCase().split(/\s+/).filter(t => t.length > 2);

        const artworks = await Promise.allSettled(topIds.map(async (id: number) => {
            const objUrl = `${MET_MUSEUM_OBJECT}/${id}`;
            const objRes = await fetchWithTimeout(objUrl, {}, 3000);
            if (!objRes.ok) return null;
            let obj: any;
            try {
                obj = await objRes.json();
            } catch {
                return null;
            }
            if (!obj.primaryImageSmall && !obj.primaryImage) return null;

            // Relevance verification
            const dept = (obj.department || '').toLowerCase();
            const culture = (obj.culture || '').toLowerCase();
            const period = (obj.period || '').toLowerCase();
            const dynasty = (obj.dynasty || '').toLowerCase();
            const title = (obj.title || '').toLowerCase();
            const country = (obj.country || '').toLowerCase();

            const isHeritageRelevant = 
                dept.includes('near east') || dept.includes('islamic') || dept.includes('asian') ||
                culture.includes('iran') || culture.includes('persi') || culture.includes('elam') ||
                country.includes('iran') ||
                qTerms.some(term => title.includes(term) || culture.includes(term) || period.includes(term) || dynasty.includes(term));

            if (!isHeritageRelevant) return null;

            return {
                id: `met-${obj.objectID}`,
                title: obj.title || 'شاهکار هنر ایرانی',
                artist: obj.artistDisplayName || 'استاد هنر و باستان‌شناسی ایران',
                period: obj.period || obj.dynasty || obj.culture || 'هنر تاریخی ایران و خاور باستان',
                date: obj.objectDate || 'کهن',
                imageUrl: obj.primaryImageSmall || obj.primaryImage,
                highResUrl: obj.primaryImage || obj.primaryImageSmall,
                museumUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${obj.objectID}`,
                department: 'موزه متروپولیتن نیویورک (Met Museum)',
                medium: obj.medium || 'اثر موزه متروپولیتن نیویورک',
                description: `${obj.culture || ''} ${obj.classification || ''} ${obj.creditLine || ''}`.trim()
            } as ArtWork;
        }));
        
        return artworks
            .filter((r): r is PromiseFulfilledResult<ArtWork | null> => r.status === 'fulfilled')
            .map(r => r.value)
            .filter(Boolean) as ArtWork[];
    } catch (e) { 
        return []; 
    }
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
    const rawQuery = (query || '').trim().toLowerCase();
    const isDefaultQuery = !rawQuery || rawQuery === 'باغ' || rawQuery === 'نگارگری' || rawQuery === 'مینیاتور' || rawQuery === 'هنر' || rawQuery === 'پردیس';
    
    // 1. Filter and match from the verified Persian Art Masterpiece Archive
    let archiveMatches: ArtWork[] = [];
    if (isDefaultQuery) {
        archiveMatches = [...PERSIAN_ART_ARCHIVE];
    } else {
        const queryTerms = rawQuery.split(/\s+/).filter(t => t.length > 1);
        archiveMatches = PERSIAN_ART_ARCHIVE.filter(art => {
            const searchableText = `${art.title} ${art.artist} ${art.period} ${art.description || ''} ${art.medium || ''}`.toLowerCase();
            return queryTerms.some(term => searchableText.includes(term));
        });
    }

    // Filter archive by Historical Period if specified
    if (period !== HistoricalPeriod.ALL) {
        const periodTerms = PERIOD_TERMS[period];
        if (periodTerms) {
            const faP = periodTerms.fa.toLowerCase();
            const enP = periodTerms.en.toLowerCase();
            const periodFiltered = archiveMatches.filter(a => 
                a.period.toLowerCase().includes(faP) || 
                a.period.toLowerCase().includes(enP) ||
                (a.description && (a.description.toLowerCase().includes(faP) || a.description.toLowerCase().includes(enP)))
            );
            if (periodFiltered.length > 0) {
                archiveMatches = periodFiltered;
            }
        }
    }

    // 2. Prepare Smart English & Persian Search Query for Live Open Access APIs
    const englishTranslated = translateToEnglishArtTerm(rawQuery);
    let apiQuery = englishTranslated;

    if (period !== HistoricalPeriod.ALL && PERIOD_TERMS[period]) {
        apiQuery += ` ${PERIOD_TERMS[period].en}`;
    }

    if (forceGardenContext && !apiQuery.toLowerCase().includes('garden')) {
        apiQuery += ` Garden`;
    }

    // Wikimedia search term (combines Persian & English for maximum coverage)
    let wikiQuery = isDefaultQuery ? 'Persian miniature garden' : apiQuery;

    console.log(`Searching Art for: API="${apiQuery}", Wiki="${wikiQuery}"`);

    // 3. Parallel Live Search across Open Access Collections
    try {
        const [clevelandRes, metRes, wikiRes] = await Promise.allSettled([
            fetchClevelandArt(apiQuery),
            fetchMetMuseum(apiQuery),
            fetchWikimediaArt(wikiQuery)
        ]);

        const liveArt: ArtWork[] = [];
        if (clevelandRes.status === 'fulfilled') liveArt.push(...clevelandRes.value);
        if (metRes.status === 'fulfilled') liveArt.push(...metRes.value);
        if (wikiRes.status === 'fulfilled') liveArt.push(...wikiRes.value);

        // 4. Combine matching archive with live discoveries
        const combined = [...archiveMatches, ...liveArt];

        const seenUrls = new Set<string>();
        const seenTitles = new Set<string>();
        const uniqueArt: ArtWork[] = [];

        for (const item of combined) {
            if (!item.imageUrl) continue;
            const normTitle = item.title.trim().toLowerCase();
            if (seenUrls.has(item.imageUrl) || seenTitles.has(normTitle)) continue;
            
            seenUrls.add(item.imageUrl);
            seenTitles.add(normTitle);
            uniqueArt.push(item);
        }

        // If specific search and nothing found at all, return empty (or default for generic empty queries)
        if (uniqueArt.length === 0) {
            return isDefaultQuery ? PERSIAN_ART_ARCHIVE.slice(0, 10) : [];
        }

        return uniqueArt;
    } catch (e) {
        console.warn("Live art search error, returning verified archive matches:", e);
        return archiveMatches;
    }
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
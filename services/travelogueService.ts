// Developed by Kian Mansouri Jamshidi
import { TravelogueChunk } from '../types';

// --- GAZETTEER: Place Name Normalization ---
// Maps historical/alt spellings (English & Persian) to a canonical ID or Name
const PLACE_ALIASES: Record<string, string> = {
    // Tehran
    'tehran': 'Tehran', 'teheran': 'Tehran', 'tihran': 'Tehran', 
    'تهران': 'Tehran', 'طهران': 'Tehran', 'golestan': 'Tehran', 'گلستان': 'Tehran',
    
    // Isfahan
    'isfahan': 'Isfahan', 'ispahan': 'Isfahan', 'spahawn': 'Isfahan', 'esfahan': 'Isfahan', 'sepahan': 'Isfahan',
    'اصفهان': 'Isfahan', 'سپاهان': 'Isfahan', 'naqsh-e jahan': 'Isfahan', 'نقش جهان': 'Isfahan',
    
    // Shiraz
    'shiraz': 'Shiraz', 'shirauz': 'Shiraz', 'schiraz': 'Shiraz',
    'شیراز': 'Shiraz', 'hafiz': 'Shiraz', 'حافظ': 'Shiraz', 'sa\'di': 'Shiraz', 'سعدی': 'Shiraz',
    
    // Yazd
    'yazd': 'Yazd', 'yezd': 'Yazd', 'yesd': 'Yazd',
    'یزد': 'Yazd', 'badgir': 'Yazd', 'بادگیر': 'Yazd',
    
    // Tabriz
    'tabriz': 'Tabriz', 'tauris': 'Tabriz', 'tebris': 'Tabriz',
    'تبریز': 'Tabriz',
    
    // Kashan
    'kashan': 'Kashan', 'cashan': 'Kashan', 'cachan': 'Kashan',
    'کاشان': 'Kashan', 'fin garden': 'Kashan', 'bagh-e fin': 'Kashan', 'باغ فین': 'Kashan',
    
    // Persepolis
    'persepolis': 'Persepolis', 'takht-e jamshid': 'Persepolis', 'chilminar': 'Persepolis',
    'تخت جمشید': 'Persepolis', 'پرسپولیس': 'Persepolis',
    
    // Qazvin
    'qazvin': 'Qazvin', 'casbin': 'Qazvin', 'kazvin': 'Qazvin',
    'قزوین': 'Qazvin',
    
    // Mashhad
    'mashhad': 'Mashhad', 'meshed': 'Mashhad',
    'مشهد': 'Mashhad',
    
    // Kerman
    'kerman': 'Kerman', 'kirman': 'Kerman',
    'کرمان': 'Kerman',
    
    // Ray
    'ray': 'Ray', 'rhages': 'Ray', 'rey': 'Ray',
    'ری': 'Ray', 'راگا': 'Ray',
    
    // Khuzestan / Susa
    'khuzestan': 'Khuzestan', 'khuzistan': 'Khuzestan',
    'خوزستان': 'Khuzestan', 'susa': 'Khuzestan', 'shush': 'Khuzestan', 'شوش': 'Khuzestan'
};

// --- KEYWORD DICTIONARY: Persian to English ---
// Enables semantic search of English texts using Persian terms
const PERSIAN_KEYWORDS: Record<string, string> = {
    'باغ': 'garden',
    'پردیس': 'paradise',
    'درخت': 'tree',
    'آب': 'water',
    'عمارت': 'palace',
    'کاخ': 'palace',
    'کوشک': 'pavilion',
    'شاه': 'shah',
    'صفوی': 'safavid',
    'قاجار': 'qajar',
    'بازار': 'bazaar',
    'مسجد': 'mosque',
    'کاشی': 'tile',
    'فرش': 'carpet',
    'سرو': 'cypress',
    'چنار': 'plane tree',
    'بیابان': 'desert',
    'کویر': 'desert',
    'قنات': 'qanat',
    'آینه': 'mirror',
    'چهارباغ': 'chahar', // matches chahar bagh
    'معماری': 'architecture'
};

// --- MOCK DATABASE: Public Domain Travelogues ---
const TRAVELOGUE_DB: TravelogueChunk[] = [
    {
        id: 'chardin-isfahan-1',
        bookTitle: "Voyages de Monsieur le Chevalier Chardin en Perse",
        author: "Jean Chardin",
        year: "1686",
        location: "Isfahan",
        text: "The Royal Square (Naqsh-e Jahan) is, without doubt, the most beautiful in the world... It is a regular rectangle, surrounded on all sides by a large covered bazaar... The grand mosque at the south end is a miracle of faience work. At night, when the lamps are lit in the arcades, the scene is one of enchantment, distinct from any other city in the Orient.",
        excerpt: "The Royal Square is, without doubt, the most beautiful in the world... surrounded on all sides by a large covered bazaar.",
        sourceUrl: "https://archive.org/details/voyageschevalier01char",
        confidence: 0.95
    },
    {
        id: 'curzon-tehran-1',
        bookTitle: "Persia and the Persian Question",
        author: "George N. Curzon",
        year: "1892",
        location: "Tehran",
        text: "Teheran, as the capital of the Qajars, presents a curious mixture of the East and West. The gates are adorned with modern tiles depicting the exploits of Rustam, yet the streets often remain unpaved and dusty... The Gulistan Palace stands as a testament to the Shah's taste, filled with mirrors and European bric-a-brac, situated amidst gardens of plane trees and running water.",
        excerpt: "Teheran presents a curious mixture of the East and West. The Gulistan Palace stands as a testament to the Shah's taste, situated amidst gardens of plane trees.",
        sourceUrl: "https://www.gutenberg.org/ebooks/search/?query=Curzon+Persia",
        confidence: 0.9
    },
    {
        id: 'browne-shiraz-1',
        bookTitle: "A Year Amongst the Persians",
        author: "Edward Granville Browne",
        year: "1893",
        location: "Shiraz",
        text: "We entered Shiraz through the Tang-i-Allahu Akbar, catching our first glimpse of the city lying like a green emerald in the valley below. The gardens of Shiraz are celebrated by Hafiz and Sa'di, though in truth many are now in a state of decay... yet the cypress trees remain majestic, standing guard over the tombs of the poets.",
        excerpt: "We entered Shiraz through the Tang-i-Allahu Akbar... catching our first glimpse of the city lying like a green emerald in the valley below.",
        sourceUrl: "https://www.gutenberg.org/ebooks/35308",
        confidence: 0.98
    },
    {
        id: 'byron-oxiana-yazd',
        bookTitle: "The Road to Oxiana",
        author: "Robert Byron",
        year: "1937",
        location: "Yazd",
        text: "Yezd (Yazd) is the most purely Persian city... It rises from the desert like a brown fortification. The wind-towers (badgirs) catch the slightest breeze to cool the houses below. Every roofscape is dominated by these towers, looking like slats of a radiator... It is the center of the Zoroastrian faith in Persia.",
        excerpt: "Yezd is the most purely Persian city... It rises from the desert like a brown fortification. The wind-towers (badgirs) catch the slightest breeze.",
        sourceUrl: "https://archive.org/details/in.ernet.dli.2015.5684",
        confidence: 0.85
    },
    {
        id: 'sackville-kashan',
        bookTitle: "Twelve Days in Persia",
        author: "Vita Sackville-West",
        year: "1928",
        location: "Kashan",
        text: "Kashan is famous for its scorpions and its velvets... but the Fin Garden nearby is the true jewel, with its cypress avenues and rushing water channels, a stark contrast to the arid plain outside. The pavilion, with its fading frescoes, tells of a time when the Safavids sought refuge here from the heat.",
        excerpt: "The Fin Garden nearby is the true jewel, with its cypress avenues and rushing water channels, a stark contrast to the arid plain outside.",
        sourceUrl: "https://archive.org/search.php?query=Sackville-West+Persia",
        confidence: 0.92
    },
    {
        id: 'polo-tabriz',
        bookTitle: "The Travels of Marco Polo",
        author: "Marco Polo",
        year: "c. 1300",
        location: "Tabriz",
        text: "Tauris (Tabriz) is a great and noble city... The inhabitants are a mixed lot, good for trade. It is situated in a province called Adherbaijan. You must know that it is a city where merchants make large profits, for the city is excellently situated for commerce, and goods are brought here from India, Baudas, and Cremesor.",
        excerpt: "Tauris is a great and noble city... situated in a province called Adherbaijan. It is a city where merchants make large profits.",
        sourceUrl: "https://www.gutenberg.org/ebooks/10636",
        confidence: 0.88
    },
    {
        id: 'bell-qazvin',
        bookTitle: "Persian Pictures",
        author: "Gertrude Bell",
        year: "1894",
        location: "Qazvin",
        text: "Kazvin (Qazvin) was once the capital, before Shah Abbas moved it to Isfahan. It still holds the charm of fallen greatness. The streets are lined with plane trees, and the tiled gateways of the shrines gleam in the sun, though the tiles are falling one by one.",
        excerpt: "Kazvin was once the capital... It still holds the charm of fallen greatness. The streets are lined with plane trees.",
        sourceUrl: "https://www.gutenberg.org/ebooks/author/496",
        confidence: 0.8
    },
    {
        id: 'layard-khuzestan',
        bookTitle: "Early Adventures in Persia",
        author: "Austen Henry Layard",
        year: "1887",
        location: "Khuzestan",
        text: "The plains of Khuzistan (Khuzestan) are scorched in the summer, but in spring they are covered with verdure. The ruins of Susa speak of the ancient Elamite glory. The Arab tribes here pitch their black tents near the banks of the Karun river.",
        excerpt: "The plains of Khuzistan are scorched in the summer... The ruins of Susa speak of the ancient Elamite glory.",
        sourceUrl: "https://www.gutenberg.org/ebooks/search/?query=Layard",
        confidence: 0.85
    },
    {
        id: 'fryer-persepolis',
        bookTitle: "A New Account of East-India and Persia",
        author: "John Fryer",
        year: "1698",
        location: "Persepolis",
        text: "Chilminar, or the Forty Pillars (Persepolis)... These stupendous ruins strike the beholder with silence. The columns, though broken, reach towards the sky, and the carvings of processions are as crisp as if cut yesterday, despite the ravages of time and Alexander's fire.",
        excerpt: "Chilminar, or the Forty Pillars... These stupendous ruins strike the beholder with silence. The columns reach towards the sky.",
        sourceUrl: "https://archive.org/details/newaccountofeast00frye",
        confidence: 0.96
    },
    {
        id: 'jackson-ray',
        bookTitle: "Persia Past and Present",
        author: "A.V. Williams Jackson",
        year: "1906",
        location: "Ray",
        text: "Rhages (Ray), the ancient city mentioned in the book of Tobit... Now but a heap of mounds and the Tower of Silence overlooking the plain. It was the birthplace of Harun al-Rashid, but the Mongols left it desolate.",
        excerpt: "Rhages, the ancient city... Now but a heap of mounds. It was the birthplace of Harun al-Rashid, but the Mongols left it desolate.",
        sourceUrl: "https://archive.org/details/persiapastpresen00jack",
        confidence: 0.89
    }
];

// --- API Implementation ---

/**
 * Searches the historical travelogues database.
 * 1. Normalizes the query using the Gazetteer (NER/Aliasing).
 * 2. Translates Persian keywords to English for semantic matching.
 * 3. Filters the chunks based on location match or text content.
 */
export const searchTravelogues = async (query: string): Promise<TravelogueChunk[]> => {
    // Simulate API network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const normalizedQuery = query.toLowerCase().trim();
    let targetLocation = "";

    // 1. Gazetteer Lookup (Fuzzy Match / Alias Resolution)
    const aliases = Object.keys(PLACE_ALIASES);
    for (const alias of aliases) {
        if (normalizedQuery.includes(alias)) {
            targetLocation = PLACE_ALIASES[alias];
            break;
        }
    }

    // 2. Keyword Translation (Persian -> English)
    // Create a list of terms to search for (Original Query + Translated Keywords)
    const searchTerms: string[] = [normalizedQuery];
    
    // Check if Persian keywords exist in query and add their English equivalents
    Object.keys(PERSIAN_KEYWORDS).forEach(faTerm => {
        if (normalizedQuery.includes(faTerm)) {
            searchTerms.push(PERSIAN_KEYWORDS[faTerm]);
        }
    });

    // 3. Filter Database
    const results = TRAVELOGUE_DB.filter(chunk => {
        // A. Location Match (Highest Priority)
        // If the query was explicitly about a known location (e.g. "Shiraz" or "شیراز"), 
        // return all entries for that location.
        if (targetLocation && chunk.location === targetLocation) {
            return true;
        }

        // B. Content Match (Semantic Search)
        // Check if ANY of the search terms (original or translated) exist in the English text
        const textLower = chunk.text.toLowerCase();
        const titleLower = chunk.bookTitle.toLowerCase();
        
        return searchTerms.some(term => 
            textLower.includes(term) || titleLower.includes(term)
        );
    });

    return results;
};

export const getTravelogueChunk = async (id: string): Promise<TravelogueChunk | undefined> => {
    return TRAVELOGUE_DB.find(c => c.id === id);
};
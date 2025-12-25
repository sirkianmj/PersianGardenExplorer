
export enum View {
  SEARCH = 'SEARCH',
  LIBRARY = 'LIBRARY',
  READER = 'READER',
  SETTINGS = 'SETTINGS'
}

export enum HistoricalPeriod {
  ALL = 'All Periods',
  ELAMITE_MEDES = 'Elamite & Medes',
  ACHAEMENID = 'Achaemenid',
  SELEUCID_PARTHIAN = 'Seleucid & Parthian',
  SASSANID = 'Sassanid',
  EARLY_ISLAMIC = 'Early Islamic',
  SELJUK_GHAZNAVID = 'Seljuk & Ghaznavid',
  ILKHANID = 'Ilkhanid',
  TIMURID = 'Timurid',
  SAFAVID = 'Safavid',
  AFSHARID_ZAND = 'Afsharid & Zand',
  QAJAR = 'Qajar',
  PAHLAVI = 'Pahlavi',
  CONTEMPORARY = 'Contemporary'
}

export enum ResearchTopic {
  GARDEN_LAYOUT = 'Garden Layout & Geometry',
  QANAT_WATER = 'Qanat & Water Systems',
  VEGETATION = 'Historical Vegetation & Botany',
  SYMBOLISM = 'Symbolism & Philosophy',
  PAVILIONS = 'Pavilions & Kiosks',
  CONSERVATION = 'Conservation & Heritage',
  GENERAL = 'General History'
}

export interface Note {
  id: string;
  page?: number;
  content: string;
  createdAt: number;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: string;
  source: string;
  abstract: string;
  period?: HistoricalPeriod;
  topic?: ResearchTopic;
  url?: string; // External URL
  localFileUrl?: string; // Blob URL for local PDF
  tags: string[];
  notes: Note[];
  addedAt: number;
  isLocal: boolean; // True if PDF is uploaded/saved
  language?: 'en' | 'fa'; // 'fa' triggers RTL and Vazirmatn font
  apiSource?: 'Semantic Scholar' | 'CrossRef' | 'Local' | 'SID' | 'NoorMags' | 'Ganjoor' | 'IranArchpedia';
  citationCount?: number;
  // Professional Metadata Fields
  citationKey?: string; // e.g., 'wilber1969persian'
  volume?: string;
  issue?: string;
  publisher?: string;
}

export interface SearchFilters {
  query: string;
  period: HistoricalPeriod;
  topic: ResearchTopic;
  useGrounding: boolean;
}

export interface GeminiSearchResult {
  title: string;
  snippet: string;
  link?: string;
}

export interface AppSettings {
  sidebarMode: 'expanded' | 'compact';
  libraryView: 'grid' | 'list';
  theme: 'light' | 'dark';
}

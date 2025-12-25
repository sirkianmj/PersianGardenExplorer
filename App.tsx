// Developed by Kian Mansouri Jamshidi
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PDFReader from './components/PDFReader';
import DatabaseModal from './components/DatabaseModal';
import { View, Paper, HistoricalPeriod, ResearchTopic, SearchFilters, AppSettings } from './types';
import { searchAcademicPapers } from './services/geminiService';
import { deleteFile, openExternalLink } from './services/storageService';

// --- Persian Dictionaries ---
const PERIOD_LABELS: Record<HistoricalPeriod, string> = {
  [HistoricalPeriod.ALL]: 'همه دوره‌ها',
  [HistoricalPeriod.ELAMITE_MEDES]: 'ایلامیان و مادها (پیش از تاریخ)',
  [HistoricalPeriod.ACHAEMENID]: 'هخامنشیان',
  [HistoricalPeriod.SELEUCID_PARTHIAN]: 'سلوکیان و اشکانیان',
  [HistoricalPeriod.SASSANID]: 'ساسانیان',
  [HistoricalPeriod.EARLY_ISLAMIC]: 'سده‌های اولیه اسلامی (طاهریان تا آل‌بویه)',
  [HistoricalPeriod.SELJUK_GHAZNAVID]: 'سلجوقیان و غزنویان',
  [HistoricalPeriod.ILKHANID]: 'ایلخانیان',
  [HistoricalPeriod.TIMURID]: 'تیموریان',
  [HistoricalPeriod.SAFAVID]: 'صفویه',
  [HistoricalPeriod.AFSHARID_ZAND]: 'افشاریه و زندیه',
  [HistoricalPeriod.QAJAR]: 'قاجار',
  [HistoricalPeriod.PAHLAVI]: 'پهلوی',
  [HistoricalPeriod.CONTEMPORARY]: 'معاصر (جمهوری اسلامی)'
};

const TOPIC_LABELS: Record<ResearchTopic, string> = {
  [ResearchTopic.GENERAL]: 'تاریخ عمومی',
  [ResearchTopic.GARDEN_LAYOUT]: 'هندسه و الگوی باغ',
  [ResearchTopic.QANAT_WATER]: 'قنات و سیستم‌های آبیاری',
  [ResearchTopic.VEGETATION]: 'پوشش گیاهی و درختان',
  [ResearchTopic.SYMBOLISM]: 'نمادشناسی و فلسفه',
  [ResearchTopic.PAVILIONS]: 'کوشک‌ها و ابنیه',
  [ResearchTopic.CONSERVATION]: 'مرمت و حفاظت'
};

const SOURCE_LABELS: Record<string, string> = {
    'Semantic Scholar': 'سمانتیک اسکالر',
    'CrossRef': 'کراس‌رف',
    'SID': 'پایگاه SID',
    'NoorMags': 'نورمگز',
    'Ganjoor': 'گنجور',
    'IranArchpedia': 'دانشنامه معماری',
    'Local': 'محلی'
};

// --- Icons ---
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const StarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
);
const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);
const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);
const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
);
const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
);

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<View>(View.SEARCH);
  const [library, setLibrary] = useState<Paper[]>([]);
  const [librarySearchQuery, setLibrarySearchQuery] = useState(''); // New Library Search State
  const [currentPaper, setCurrentPaper] = useState<Paper | null>(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [paperToEdit, setPaperToEdit] = useState<Paper | null>(null);
  
  // App Settings
  const [settings, setSettings] = useState<AppSettings>({
    sidebarMode: 'expanded',
    libraryView: 'grid',
    theme: 'light'
  });

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    period: HistoricalPeriod.ALL,
    topic: ResearchTopic.GENERAL,
    useGrounding: true
  });
  const [searchResults, setSearchResults] = useState<Partial<Paper>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    const savedLib = localStorage.getItem('pardis_library');
    if (savedLib) {
      setLibrary(JSON.parse(savedLib));
    }
    const savedSettings = localStorage.getItem('pardis_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pardis_library', JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    localStorage.setItem('pardis_settings', JSON.stringify(settings));
  }, [settings]);

  // Derived State: Filtered Library
  const filteredLibrary = library.filter(paper => {
      if (!librarySearchQuery.trim()) return true;
      const q = librarySearchQuery.toLowerCase().trim();
      return (
          paper.title?.toLowerCase().includes(q) ||
          paper.authors?.some(a => a.toLowerCase().includes(q)) ||
          paper.year?.includes(q) ||
          paper.abstract?.toLowerCase().includes(q) ||
          paper.source?.toLowerCase().includes(q) ||
          paper.tags?.some(t => t.toLowerCase().includes(q))
      );
  });

  // Settings Handlers
  const toggleSidebarMode = () => {
      setSettings(prev => ({
          ...prev,
          sidebarMode: prev.sidebarMode === 'expanded' ? 'compact' : 'expanded'
      }));
  };

  const setLibraryView = (view: 'grid' | 'list') => {
      setSettings(prev => ({ ...prev, libraryView: view }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filters.query.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
        const results = await searchAcademicPapers(filters.query, filters.period, filters.topic);
        setSearchResults(results);
    } catch (error) {
        alert("جستجو با خطا مواجه شد. لطفاً اتصال اینترنت خود را بررسی کنید.");
    } finally {
        setIsSearching(false);
    }
  };

  const handleQuickAdd = (paper: Partial<Paper>) => {
      const newPaper: Paper = {
          ...paper,
          id: paper.id || crypto.randomUUID(),
          title: paper.title || 'بدون عنوان',
          authors: paper.authors || [],
          year: paper.year || 'نامشخص',
          source: paper.source || 'نامشخص',
          abstract: paper.abstract || '',
          tags: [filters.topic !== ResearchTopic.GENERAL ? filters.topic : 'General'],
          notes: [],
          addedAt: Date.now(),
          isLocal: false,
          language: paper.language || 'fa',
          apiSource: paper.apiSource,
          citationCount: paper.citationCount
      };
      setLibrary(prev => [newPaper, ...prev]);
  };

  const handleSaveDbRecord = (paper: Paper) => {
    setLibrary(prev => {
      const exists = prev.findIndex(p => p.id === paper.id);
      if (exists !== -1) {
        const updated = [...prev];
        updated[exists] = paper;
        return updated;
      }
      return [paper, ...prev];
    });
  };

  const handleDeletePaper = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm('آیا از حذف این سند از کتابخانه اطمینان دارید؟')) {
      await deleteFile(id);
      setLibrary(prev => prev.filter(p => p.id !== id));
      if(currentPaper?.id === id) setCurrentPaper(null);
    }
  };

  const handleEditPaper = (paper: Paper, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaperToEdit(paper);
    setIsDbModalOpen(true);
  };

  const handleOpenReader = (paper: Paper) => {
      setCurrentPaper(paper);
      setCurrentView(View.READER);
  };

  const handleUpdateNote = (paperId: string, note: any) => {
      setLibrary(prev => prev.map(p => {
          if (p.id === paperId) {
              return { ...p, notes: [...p.notes, note] };
          }
          return p;
      }));
      if (currentPaper?.id === paperId) {
          setCurrentPaper(prev => prev ? ({ ...prev, notes: [...prev.notes, note] }) : null);
      }
  };

  const getBadgeColor = (source?: string) => {
      switch(source) {
          case 'Semantic Scholar': return 'bg-blue-50 text-blue-700 border-blue-100';
          case 'CrossRef': return 'bg-orange-50 text-orange-700 border-orange-100';
          case 'SID': return 'bg-purple-50 text-purple-700 border-purple-100';
          case 'NoorMags': return 'bg-green-50 text-green-700 border-green-100';
          case 'Ganjoor': return 'bg-red-50 text-red-700 border-red-100';
          case 'IranArchpedia': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
          default: return 'bg-gray-50 text-gray-700 border-gray-100';
      }
  };

  const getViewTitle = () => {
    switch(currentView) {
        case View.SEARCH: return 'کاوش در منابع';
        case View.LIBRARY: return 'کتابخانه من';
        case View.READER: return 'سالن مطالعه';
        case View.SETTINGS: return 'تنظیمات';
        default: return 'کاوشگر باغ ایرانی';
    }
  };

  return (
    <div className="flex h-screen bg-paper-bg font-persian relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-pattern-girih opacity-[0.03] pointer-events-none z-0"></div>

      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView}
        savedCount={library.length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        mode={settings.sidebarMode}
        onToggleMode={toggleSidebarMode}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative z-10 w-full transition-all duration-300">
        
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-garden-dark text-white flex items-center px-4 justify-between shrink-0 shadow-md">
            <button onClick={() => setIsSidebarOpen(true)} className="p-1">
                <MenuIcon />
            </button>
            <span className="font-nastaliq text-lg">{getViewTitle()}</span>
            <div className="w-6" /> {/* Spacer for centering */}
        </div>

        {/* Search View */}
        {currentView === View.SEARCH && (
            <div className="flex flex-col h-full">
                <div className="p-6 md:p-8 border-b border-stone-200 bg-white shadow-sm relative overflow-hidden shrink-0">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-garden-dark via-tile-blue to-clay-accent"></div>
                    
                    <h2 className="text-2xl md:text-3xl font-nastaliq text-garden-dark mb-6 mt-2 drop-shadow-sm hidden md:block">
                        کاوش علمی در منابع معماری
                    </h2>
                    
                    <form onSubmit={handleSearch} className="space-y-4 max-w-4xl mx-auto relative z-10">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative group">
                                <div className="absolute top-3.5 right-4 text-gray-400 pointer-events-none group-focus-within:text-tile-blue transition-colors">
                                   <SearchIcon />
                                </div>
                                <input 
                                    type="text" 
                                    value={filters.query}
                                    onChange={e => setFilters({...filters, query: e.target.value})}
                                    placeholder="جستجوی موضوعی (مثلاً: باغ فین)"
                                    className="w-full py-3 pr-12 pl-4 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-tile-blue shadow-inner bg-gray-50 focus:bg-white transition-all duration-300 text-sm md:text-base"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSearching}
                                className="bg-garden-dark text-white px-8 py-3 rounded-lg font-medium hover:bg-tile-dark disabled:opacity-70 shadow-md transition-all flex items-center justify-center gap-2 w-full md:w-auto"
                            >
                                {isSearching ? <span className="animate-pulse">...</span> : 'جستجو'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <select 
                                value={filters.period}
                                onChange={e => setFilters({...filters, period: e.target.value as HistoricalPeriod})}
                                className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-700 bg-white focus:border-tile-blue focus:ring-0 w-full"
                            >
                                {Object.values(HistoricalPeriod).map(p => (
                                    <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                                ))}
                            </select>
                            
                            <select 
                                value={filters.topic}
                                onChange={e => setFilters({...filters, topic: e.target.value as ResearchTopic})}
                                className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-700 bg-white focus:border-tile-blue focus:ring-0 w-full"
                            >
                                {Object.values(ResearchTopic).map(t => (
                                    <option key={t} value={t}>{TOPIC_LABELS[t]}</option>
                                ))}
                            </select>
                        </div>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-paper-bg">
                    {searchResults.length === 0 && !isSearching && (
                        <div className="flex flex-col items-center justify-center h-2/3 text-gray-400">
                            <div className="text-4xl md:text-6xl mb-4 opacity-20">🏛️</div>
                            <p className="text-lg md:text-xl font-nastaliq text-gray-500 mb-2">برای دسترسی به نمایه دانشگاهی، جستجو کنید</p>
                            <p className="text-xs md:text-sm text-gray-400 border-t border-gray-300 pt-4 mt-2 px-8 text-center">
                                منابع: SID، نورمگز، گنجور، دانشنامه معماری و منابع بین‌المللی
                            </p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto pb-20 md:pb-0">
                        {searchResults.map((result) => (
                            <div 
                                key={result.id} 
                                className="bg-white p-5 md:p-6 rounded-lg border-r-4 border-r-transparent hover:border-r-tile-blue shadow-sm hover:shadow-md transition-all duration-300 group"
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start gap-3 md:gap-4">
                                    <div className="flex-1 w-full">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getBadgeColor(result.apiSource)}`}>
                                                 {SOURCE_LABELS[result.apiSource || 'Local'] || result.apiSource}
                                            </span>
                                            {result.citationCount !== undefined && result.citationCount > 0 && (
                                                <span className="text-[10px] flex items-center gap-1 text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-sans">
                                                   <StarIcon /> {result.citationCount}
                                                </span>
                                            )}
                                        </div>
                                        <h3 
                                            className="text-lg md:text-xl text-garden-dark font-bold cursor-pointer hover:text-tile-blue transition-colors leading-relaxed font-sans"
                                            onClick={() => handleQuickAdd(result)}
                                        >
                                            {result.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-500 mt-2">
                                            <span className="text-clay-accent font-medium">{result.authors?.join('، ')}</span>
                                            <span className="text-gray-300 hidden md:inline">•</span>
                                            <span className="font-sans bg-gray-50 px-2 rounded border border-gray-100">{result.year}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end md:self-start flex-shrink-0">
                                        {result.url && (
                                            <button 
                                                onClick={() => openExternalLink(result.url!)}
                                                className="text-gray-400 hover:text-tile-blue p-2 rounded-full transition hover:bg-cyan-50"
                                                title="مشاهده لینک اصلی"
                                            >
                                                <ExternalLinkIcon />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleQuickAdd(result)}
                                            className="text-garden-dark hover:bg-garden-light hover:text-garden-dark p-2 rounded-full transition border border-gray-200 hover:border-garden-dark"
                                            title="افزودن سریع به کتابخانه"
                                        >
                                            <PlusIcon />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-gray-600 mt-3 text-sm leading-relaxed text-justify border-t border-gray-50 pt-3 hidden sm:block">
                                    {result.abstract}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Library View */}
        {currentView === View.LIBRARY && (
            <div className="flex flex-col h-full">
                <div className="p-6 md:p-8 border-b border-gray-200 bg-white flex flex-col gap-6 shadow-sm z-10 shrink-0">
                    <div className="flex flex-wrap gap-4 justify-between items-center">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-nastaliq text-garden-dark mt-2 hidden md:block">آرشیو محلی</h2>
                            <p className="text-sm text-gray-500 mt-1 font-sans flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-tile-blue inline-block"></span>
                                {library.length} سند ذخیره شده
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {/* View Switcher */}
                            <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                                <button 
                                    onClick={() => setLibraryView('grid')}
                                    className={`p-2 rounded-md transition ${settings.libraryView === 'grid' ? 'bg-white shadow text-garden-dark' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="نمای شبکه‌ای"
                                >
                                    <GridIcon />
                                </button>
                                <button 
                                    onClick={() => setLibraryView('list')}
                                    className={`p-2 rounded-md transition ${settings.libraryView === 'list' ? 'bg-white shadow text-garden-dark' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="نمای لیستی"
                                >
                                    <ListIcon />
                                </button>
                            </div>

                            <button 
                                onClick={() => {
                                    setPaperToEdit(null);
                                    setIsDbModalOpen(true);
                                }}
                                className="bg-gradient-to-r from-clay-accent to-orange-700 text-white px-5 py-2 md:px-6 md:py-2.5 rounded-lg shadow-md hover:shadow-lg hover:from-orange-700 hover:to-clay-accent transition-all text-sm flex items-center gap-2 font-medium"
                            >
                                <PlusIcon />
                                <span className="hidden sm:inline">سند جدید</span>
                            </button>
                        </div>
                    </div>

                    {/* Local Search Bar */}
                    <div className="relative group w-full max-w-2xl">
                        <div className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 group-focus-within:text-tile-blue transition-colors">
                            <SearchIcon />
                        </div>
                        <input 
                            type="text" 
                            value={librarySearchQuery}
                            onChange={(e) => setLibrarySearchQuery(e.target.value)}
                            placeholder="جستجو در کتابخانه (عنوان، نویسنده، متن، برچسب...)"
                            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:border-tile-blue focus:ring-1 focus:ring-tile-blue transition-all text-sm"
                        />
                         {librarySearchQuery && (
                            <button 
                                onClick={() => setLibrarySearchQuery('')}
                                className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 hover:text-red-500 transition-colors bg-transparent border-none p-0 cursor-pointer"
                                title="پاک کردن جستجو"
                            >
                                ✕
                            </button>
                         )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-paper-bg">
                    {library.length === 0 ? (
                         <div className="text-center text-gray-400 mt-20">
                            <div className="text-5xl md:text-6xl mb-4 opacity-20">📚</div>
                            <p className="text-lg font-nastaliq">کتابخانه شما خالی است</p>
                        </div>
                    ) : filteredLibrary.length === 0 ? (
                        <div className="text-center text-gray-400 mt-20">
                            <div className="text-5xl md:text-6xl mb-4 opacity-20">🔍</div>
                            <p className="text-lg font-nastaliq mb-2">نتیجه‌ای یافت نشد</p>
                            <p className="text-sm font-sans">برای عبارت «{librarySearchQuery}» سندی پیدا نشد.</p>
                        </div>
                    ) : (
                        <div className={`
                            ${settings.libraryView === 'grid' 
                                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6' 
                                : 'flex flex-col gap-3'
                            }
                            pb-20 md:pb-0
                        `}>
                            {filteredLibrary.map((paper) => (
                                <div 
                                    key={paper.id} 
                                    onClick={() => handleOpenReader(paper)}
                                    className={`
                                        bg-white group border border-gray-200 cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden
                                        ${settings.libraryView === 'grid' 
                                            ? 'rounded-xl flex flex-col h-auto md:h-72' 
                                            : 'rounded-lg flex flex-row items-center p-3 hover:border-tile-blue'
                                        }
                                    `}
                                >
                                    {/* Grid View Content */}
                                    {settings.libraryView === 'grid' && (
                                        <>
                                            <div className={`h-1.5 w-full ${paper.isLocal ? 'bg-tile-blue' : 'bg-gray-300'}`}></div>
                                            <div className="absolute top-4 left-4 md:opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10 bg-white/90 p-1 rounded-lg shadow-sm backdrop-blur-sm">
                                                 <button onClick={(e) => handleEditPaper(paper, e)} className="p-1.5 text-gray-500 hover:text-tile-blue rounded transition"><EditIcon /></button>
                                                 <button onClick={(e) => handleDeletePaper(paper.id, e)} className="p-1.5 text-gray-500 hover:text-red-600 rounded transition">&times;</button>
                                            </div>
                                            <div className="flex-1 p-5 flex flex-col">
                                                <div className="flex gap-1 flex-wrap mb-2">
                                                     <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${paper.isLocal ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>{paper.isLocal ? 'PDF' : 'Meta'}</span>
                                                    {paper.apiSource && <span className={`text-[9px] px-1 py-0.5 border rounded-full ${getBadgeColor(paper.apiSource)}`}>{SOURCE_LABELS[paper.apiSource] || paper.apiSource}</span>}
                                                </div>
                                                <h3 className="text-base md:text-lg font-bold text-gray-800 group-hover:text-tile-blue transition-colors line-clamp-2 leading-tight font-sans mb-2">{paper.title}</h3>
                                                <p className="text-xs text-clay-accent font-medium mb-1 line-clamp-1">{paper.authors.join('، ')}</p>
                                                <p className="text-xs text-gray-400 font-sans mb-3">{paper.year}</p>
                                                <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed text-justify opacity-80 hidden sm:block">{paper.abstract}</p>
                                            </div>
                                        </>
                                    )}

                                    {/* List View Content */}
                                    {settings.libraryView === 'list' && (
                                        <>
                                            <div className={`w-1 h-full absolute right-0 top-0 bottom-0 ${paper.isLocal ? 'bg-tile-blue' : 'bg-gray-300'}`}></div>
                                            
                                            <div className="flex-1 min-w-0 pr-3">
                                                <h3 className="text-sm md:text-base font-bold text-gray-800 group-hover:text-tile-blue truncate">{paper.title}</h3>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                    <span className="text-clay-accent">{paper.authors[0]}</span>
                                                    <span className="hidden sm:inline text-gray-300">•</span>
                                                    <span className="hidden sm:inline font-sans">{paper.year}</span>
                                                    {paper.apiSource && <span className={`hidden sm:inline px-1.5 py-0.5 rounded border text-[9px] ${getBadgeColor(paper.apiSource)}`}>{paper.apiSource}</span>}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pl-2">
                                                 <button onClick={(e) => handleEditPaper(paper, e)} className="p-2 text-gray-400 hover:text-tile-blue rounded-full hover:bg-gray-100 transition"><EditIcon /></button>
                                                 <button onClick={(e) => handleDeletePaper(paper.id, e)} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition text-lg leading-none">&times;</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Reader View */}
        {currentView === View.READER && (
            <PDFReader 
                paper={currentPaper} 
                onUpdateNote={handleUpdateNote}
                onClose={() => setCurrentView(View.LIBRARY)}
            />
        )}
        
        {/* Settings View */}
        {currentView === View.SETTINGS && (
             <div className="p-6 md:p-12 overflow-y-auto h-full">
                 <h2 className="text-2xl md:text-3xl font-nastaliq text-garden-dark mb-6 mt-2">تنظیمات سیستم</h2>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Appearance */}
                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">ظاهر و چیدمان</h3>
                        <div className="space-y-6">
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">منوی کناری (دسکتاپ)</p>
                                    <p className="text-xs text-gray-500">حالت فشرده فضای بیشتری برای مطالعه می‌دهد</p>
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setSettings(s => ({...s, sidebarMode: 'expanded'}))}
                                        className={`px-3 py-1.5 text-xs rounded-md transition ${settings.sidebarMode === 'expanded' ? 'bg-white shadow text-garden-dark font-bold' : 'text-gray-500'}`}
                                    >
                                        گسترده
                                    </button>
                                    <button 
                                        onClick={() => setSettings(s => ({...s, sidebarMode: 'compact'}))}
                                        className={`px-3 py-1.5 text-xs rounded-md transition ${settings.sidebarMode === 'compact' ? 'bg-white shadow text-garden-dark font-bold' : 'text-gray-500'}`}
                                    >
                                        فشرده
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">نمای پیش‌فرض کتابخانه</p>
                                    <p className="text-xs text-gray-500">نحوه نمایش اسناد در آرشیو</p>
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setLibraryView('grid')}
                                        className={`px-3 py-1.5 text-xs rounded-md transition ${settings.libraryView === 'grid' ? 'bg-white shadow text-garden-dark font-bold' : 'text-gray-500'}`}
                                    >
                                        شبکه‌ای
                                    </button>
                                    <button 
                                        onClick={() => setLibraryView('list')}
                                        className={`px-3 py-1.5 text-xs rounded-md transition ${settings.libraryView === 'list' ? 'bg-white shadow text-garden-dark font-bold' : 'text-gray-500'}`}
                                    >
                                        لیستی
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Data Sources */}
                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-pattern-girih opacity-10"></div>
                        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">منابع داده متصل</h3>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {['SID', 'NoorMags', 'Ganjoor', 'IranArchpedia', 'Semantic Scholar'].map(s => (
                                <span key={s} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded border border-green-100">{s}</span>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                             <button 
                                onClick={() => {
                                    if(confirm("آیا مطمئن هستید؟ تمام داده‌های کتابخانه حذف خواهد شد.")) {
                                        localStorage.removeItem('pardis_library');
                                        setLibrary([]);
                                    }
                                }}
                                className="text-red-600 text-sm hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded transition border border-transparent hover:border-red-100 flex items-center gap-2 w-full justify-center"
                            >
                                <span className="text-lg">🗑️</span>
                                پاکسازی کامل پایگاه داده محلی
                             </button>
                        </div>
                    </div>
                 </div>

                 {/* Developer Credits */}
                 <div className="mt-12 pt-8 border-t border-gray-200 text-center">
                    <p className="text-gray-500 font-medium font-sans text-sm leading-loose">
                        توسعه دهنده : کیان منصوری جمشیدی | درس: باغ ایرانی | استاد : دکتر جیحانی | دانشگاه بهشتی | 1404
                    </p>
                    <p className="text-xs text-gray-300 mt-2 font-sans opacity-50">
                        Developed by Kian Mansouri Jamshidi
                    </p>
                </div>
             </div>
        )}

        {/* Database Modal Overlay */}
        <DatabaseModal 
            isOpen={isDbModalOpen} 
            onClose={() => setIsDbModalOpen(false)}
            onSave={handleSaveDbRecord}
            initialData={paperToEdit}
        />

      </main>
    </div>
  );
};

export default App;
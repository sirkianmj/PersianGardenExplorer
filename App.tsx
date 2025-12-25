
// Developed by Kian Mansouri Jamshidi
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PDFReader from './components/PDFReader';
import DatabaseModal from './components/DatabaseModal';
import IranMap from './components/IranMap';
import { View, Paper, HistoricalPeriod, ResearchTopic, SearchFilters, AppSettings, ArtWork, TravelogueChunk } from './types';
import { searchAcademicPapers, searchPersianArt } from './services/geminiService';
import { searchTravelogues } from './services/travelogueService';
import { deletePaperRecord, getAllPapers, savePaperMetadata, exportDatabase, importDatabase, openExternalLink } from './services/storageService';

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
const GalleryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
);
const PaperIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);
const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
);

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<View>(View.SEARCH);
  const [library, setLibrary] = useState<Paper[]>([]);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [currentPaper, setCurrentPaper] = useState<Paper | null>(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [paperToEdit, setPaperToEdit] = useState<Paper | null>(null);
  const [loadingLib, setLoadingLib] = useState(true);
  
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
  
  // Search State
  const [searchTab, setSearchTab] = useState<'papers' | 'art'>('papers');
  const [paperResults, setPaperResults] = useState<Partial<Paper>[]>([]);
  const [artResults, setArtResults] = useState<ArtWork[]>([]);
  const [travelogueResults, setTravelogueResults] = useState<TravelogueChunk[]>([]);
  const [selectedTravelogue, setSelectedTravelogue] = useState<TravelogueChunk | null>(null); // For Modal
  const [isSearching, setIsSearching] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Initialize and Load Data
  useEffect(() => {
    const loadData = async () => {
        setLoadingLib(true);
        try {
            // Load Settings
            const savedSettings = localStorage.getItem('pardis_settings');
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }

            // Load Library from IndexedDB
            const storedPapers = await getAllPapers();
            setLibrary(storedPapers);
        } catch (e) {
            console.error("Failed to load library:", e);
        } finally {
            setLoadingLib(false);
        }
    };
    loadData();
  }, []);

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

  // Reusable Search Execution Logic
  const executeSearch = async (query: string, period: HistoricalPeriod, topic: ResearchTopic) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setPaperResults([]);
    setArtResults([]);
    setTravelogueResults([]);
    
    try {
        // Parallel execution of Academic search, Art search, and Travelogue search
        const [pResults, aResults, tResults] = await Promise.all([
             searchAcademicPapers(query, period, topic),
             searchPersianArt(query),
             searchTravelogues(query)
        ]);
        
        setPaperResults(pResults);
        setArtResults(aResults);
        setTravelogueResults(tResults);

        // Auto-switch tab logic
        if (pResults.length === 0 && aResults.length > 0) {
            setSearchTab('art');
        } else if (pResults.length > 0) {
            setSearchTab('papers');
        }

    } catch (error) {
        alert("جستجو با خطا مواجه شد. لطفاً اتصال اینترنت خود را بررسی کنید.");
    } finally {
        setIsSearching(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(filters.query, filters.period, filters.topic);
  };

  // Handler for Map Clicks
  const handleMapSearch = (smartQuery: string) => {
    setFilters(prev => ({ ...prev, query: smartQuery }));
    setCurrentView(View.SEARCH);
    executeSearch(smartQuery, filters.period, filters.topic);
  };

  const handleQuickAdd = async (paper: Partial<Paper>) => {
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
          citationCount: paper.citationCount,
          docType: 'paper'
      };

      // Persist immediately
      await savePaperMetadata(newPaper);
      setLibrary(prev => [newPaper, ...prev]);
  };

  const handleQuickAddArt = async (art: ArtWork) => {
      const newPaper: Paper = {
          id: `art-${art.id}`,
          title: art.title,
          authors: [art.artist],
          year: art.date || 'نامشخص',
          source: art.department || 'Visual Archive',
          abstract: `${art.medium} • ${art.period} • ${art.department}`,
          url: art.museumUrl, // External Link to Museum
          thumbnailUrl: art.highResUrl || art.imageUrl, // Full Quality Link
          docType: 'artwork', // Distinguish from papers
          tags: ['Visual Art', art.period],
          notes: [],
          addedAt: Date.now(),
          isLocal: false,
          language: 'en',
          apiSource: 'Local' // Treated as local entry but remote image
      };
      
      await savePaperMetadata(newPaper);
      setLibrary(prev => [newPaper, ...prev]);
      alert('تصویر به کتابخانه اضافه شد.');
  };

  const handleSaveDbRecord = async (paper: Paper) => {
    // Persist to DB
    await savePaperMetadata(paper);
    
    // Update State
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
      await deletePaperRecord(id);
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

  const handleUpdateNote = async (paperId: string, note: any) => {
      // Find current paper to update
      const targetPaper = library.find(p => p.id === paperId);
      if (!targetPaper) return;

      const updatedPaper = { ...targetPaper, notes: [...targetPaper.notes, note] };
      
      // Persist
      await savePaperMetadata(updatedPaper);

      // Update State
      setLibrary(prev => prev.map(p => p.id === paperId ? updatedPaper : p));
      
      if (currentPaper?.id === paperId) {
          setCurrentPaper(updatedPaper);
      }
  };

  const handleExportBackup = async () => {
      try {
          const json = await exportDatabase();
          const blob = new Blob([json], {type: 'application/json'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pardis-backup-${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
      } catch (e) {
          alert('خطا در تهیه نسخه پشتیبان');
      }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = event.target?.result as string;
              if (confirm('آیا مطمئن هستید؟ این کار اطلاعات فعلی را با نسخه پشتیبان ادغام می‌کند.')) {
                  const imported = await importDatabase(json);
                  setLibrary(imported); // Refresh view with imported data
                  alert('بازیابی با موفقیت انجام شد.');
              }
          } catch (err) {
              alert('فایل پشتیبان نامعتبر است.');
          }
      };
      reader.readAsText(file);
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
        case View.ATLAS: return 'اطلس باغ‌های ایرانی';
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
                    
                    <form onSubmit={handleSearchSubmit} className="space-y-4 max-w-4xl mx-auto relative z-10">
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
                    
                    {/* Search Tabs */}
                    <div className="flex justify-center mt-6 gap-2">
                        <button 
                            onClick={() => setSearchTab('papers')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${searchTab === 'papers' ? 'bg-tile-blue text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <PaperIcon /> منابع متنی <span className="opacity-70 text-xs font-sans">({paperResults.length})</span>
                        </button>
                         <button 
                            onClick={() => setSearchTab('art')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${searchTab === 'art' ? 'bg-clay-accent text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <GalleryIcon /> آرشیو تصویری (نگارگری) <span className="opacity-70 text-xs font-sans">({artResults.length})</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-paper-bg space-y-8">
                    
                    {/* Historical Travelogues Section (Appears first if relevant) */}
                    {travelogueResults.length > 0 && (
                        <div className="max-w-4xl mx-auto" dir="ltr">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">📜</span>
                                <h3 className="font-serif text-xl text-garden-dark border-b-2 border-gold-accent pb-1 pr-4 inline-block">Historical Travelogues</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {travelogueResults.map(chunk => (
                                    <div key={chunk.id} className="bg-[#fdfbf7] border border-[#e8dfc4] p-5 rounded-sm shadow-sm relative overflow-hidden group">
                                        {/* Decorative Corner */}
                                        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#e8dfc4] to-transparent"></div>
                                        
                                        <p className="font-serif text-lg leading-relaxed text-gray-800 italic mb-3">
                                            "{chunk.excerpt}"
                                        </p>
                                        <div className="flex flex-wrap items-center justify-between text-sm text-gray-600 font-sans border-t border-[#e8dfc4] pt-3 mt-2">
                                            <div>
                                                <span className="font-bold text-clay-accent">{chunk.bookTitle}</span>
                                                <span className="mx-2 text-gray-400">•</span>
                                                <span>{chunk.author} ({chunk.year})</span>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedTravelogue(chunk)}
                                                className="mt-2 sm:mt-0 text-garden-dark font-medium hover:underline flex items-center gap-1"
                                            >
                                                <BookIcon /> Read More
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {paperResults.length === 0 && artResults.length === 0 && travelogueResults.length === 0 && !isSearching && (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <div className="text-4xl md:text-6xl mb-4 opacity-20">🏛️</div>
                            <p className="text-lg md:text-xl font-nastaliq text-gray-500 mb-2">برای دسترسی به نمایه دانشگاهی، جستجو کنید</p>
                        </div>
                    )}

                    {/* Papers List */}
                    {searchTab === 'papers' && (
                         <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto pb-20 md:pb-0">
                            {paperResults.map((result) => (
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
                    )}
                    
                    {/* Art Gallery Grid */}
                    {searchTab === 'art' && (
                        <div className="columns-1 sm:columns-2 md:columns-3 gap-6 max-w-6xl mx-auto space-y-6 pb-20 md:pb-0" dir="ltr">
                             {artResults.map(art => (
                                 <div key={art.id} className="break-inside-avoid bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow border border-gray-100 group">
                                     <div className="relative overflow-hidden">
                                         <img 
                                            src={art.imageUrl} 
                                            alt={art.title} 
                                            className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                            loading="lazy"
                                         />
                                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
                                             <button 
                                                onClick={() => openExternalLink(art.highResUrl)}
                                                className="text-white text-xs bg-white/20 backdrop-blur px-3 py-1 rounded-full hover:bg-white/40 transition"
                                             >
                                                View Original ↗
                                             </button>
                                             <button 
                                                onClick={() => handleQuickAddArt(art)}
                                                className="bg-clay-accent text-white p-2 rounded-full hover:bg-orange-600 shadow-lg transform hover:scale-110 transition"
                                                title="Save to Library"
                                             >
                                                <PlusIcon />
                                             </button>
                                         </div>
                                     </div>
                                     <div className="p-4">
                                         <h4 className="font-bold text-gray-800 text-sm mb-1 leading-snug">{art.title}</h4>
                                         <p className="text-xs text-clay-accent font-medium mb-2">{art.artist}</p>
                                         <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 font-sans border-t border-gray-100 pt-2">
                                             <span className="bg-gray-50 px-2 py-0.5 rounded">{art.date}</span>
                                             <span className="bg-gray-50 px-2 py-0.5 rounded truncate max-w-[150px]">{art.period}</span>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    )}

                </div>
            </div>
        )}

        {/* Atlas/Map View */}
        {currentView === View.ATLAS && (
            <IranMap onProvinceSelect={handleMapSearch} />
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
                                {loadingLib ? '...' : library.length} سند ذخیره شده
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
                    {loadingLib ? (
                         <div className="text-center text-gray-400 mt-20">
                             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-garden-dark mx-auto mb-4"></div>
                             <p className="text-lg font-nastaliq">در حال بارگذاری آرشیو...</p>
                         </div>
                    ) : library.length === 0 ? (
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
                                            {paper.thumbnailUrl ? (
                                                <div className="h-32 w-full bg-gray-200 overflow-hidden relative">
                                                    <img src={paper.thumbnailUrl} alt={paper.title} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                                </div>
                                            ) : (
                                                <div className={`h-1.5 w-full ${paper.isLocal ? 'bg-tile-blue' : 'bg-gray-300'}`}></div>
                                            )}
                                            
                                            <div className="absolute top-4 left-4 md:opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10 bg-white/90 p-1 rounded-lg shadow-sm backdrop-blur-sm">
                                                 <button onClick={(e) => handleEditPaper(paper, e)} className="p-1.5 text-gray-500 hover:text-tile-blue rounded transition"><EditIcon /></button>
                                                 <button onClick={(e) => handleDeletePaper(paper.id, e)} className="p-1.5 text-gray-500 hover:text-red-600 rounded transition">&times;</button>
                                            </div>
                                            <div className="flex-1 p-5 flex flex-col">
                                                <div className="flex gap-1 flex-wrap mb-2">
                                                     <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${paper.isLocal ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>{paper.isLocal ? 'PDF' : 'Meta'}</span>
                                                    {paper.apiSource && <span className={`text-[9px] px-1 py-0.5 border rounded-full ${getBadgeColor(paper.apiSource)}`}>{SOURCE_LABELS[paper.apiSource] || paper.apiSource}</span>}
                                                </div>
                                                <h3 className="text-base md:text-lg font-bold text-gray-800 group-hover:text-tile-blue transition-colors line-clamp-2 leading-tight font-sans mb-2" dir={paper.docType === 'artwork' ? 'ltr' : 'rtl'}>{paper.title}</h3>
                                                <p className="text-xs text-clay-accent font-medium mb-1 line-clamp-1">{paper.authors.join('، ')}</p>
                                                <p className="text-xs text-gray-400 font-sans mb-3">{paper.year}</p>
                                                {paper.docType !== 'artwork' && (
                                                    <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed text-justify opacity-80 hidden sm:block">{paper.abstract}</p>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* List View Content */}
                                    {settings.libraryView === 'list' && (
                                        <>
                                            {paper.thumbnailUrl ? (
                                                <div className="w-16 h-16 rounded overflow-hidden mr-3 shrink-0 ml-3">
                                                    <img src={paper.thumbnailUrl} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className={`w-1 h-full absolute right-0 top-0 bottom-0 ${paper.isLocal ? 'bg-tile-blue' : 'bg-gray-300'}`}></div>
                                            )}
                                            
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

                    {/* Data Management */}
                    <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-pattern-girih opacity-10"></div>
                        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">مدیریت داده‌ها (پشتیبان‌گیری)</h3>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={handleExportBackup}
                                className="w-full border border-gray-300 hover:border-tile-blue text-gray-700 hover:text-tile-blue px-4 py-3 rounded-lg transition flex items-center justify-center gap-3 bg-gray-50 hover:bg-white"
                            >
                                <span className="text-xl">⬇️</span>
                                <div>
                                    <span className="block font-bold text-sm">دریافت نسخه پشتیبان (Export)</span>
                                    <span className="block text-[10px] opacity-70">دانلود فایل JSON شامل تمام اطلاعات</span>
                                </div>
                            </button>

                            <label className="w-full border border-gray-300 hover:border-green-600 text-gray-700 hover:text-green-700 px-4 py-3 rounded-lg transition flex items-center justify-center gap-3 bg-gray-50 hover:bg-white cursor-pointer">
                                <span className="text-xl">⬆️</span>
                                <div>
                                    <span className="block font-bold text-sm">بازگردانی اطلاعات (Import)</span>
                                    <span className="block text-[10px] opacity-70">انتخاب فایل JSON برای بازیابی</span>
                                </div>
                                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                            </label>

                             <button 
                                onClick={() => {
                                    if(confirm("هشدار: تمام داده‌های کتابخانه حذف خواهد شد و قابل بازگشت نیست. ادامه می‌دهید؟")) {
                                        // This creates a hard reset if needed
                                        indexedDB.deleteDatabase('PardisScholarDB');
                                        window.location.reload();
                                    }
                                }}
                                className="text-red-600 text-xs hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded transition border border-transparent hover:border-red-100 flex items-center gap-2 w-full justify-center mt-4"
                            >
                                <span>⚠️</span>
                                حذف کامل پایگاه داده و شروع مجدد
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

        {/* Travelogue Reading Modal */}
        {selectedTravelogue && (
            <div className="fixed inset-0 bg-garden-dark/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="ltr">
                <div className="bg-[#fdfbf7] w-full max-w-2xl rounded shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-[#e8dfc4]">
                    <div className="bg-[#f3e9cf] p-4 border-b border-[#e8dfc4] flex justify-between items-center">
                        <h3 className="font-serif font-bold text-lg text-garden-dark italic">{selectedTravelogue.bookTitle}</h3>
                        <button onClick={() => setSelectedTravelogue(null)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                    </div>
                    <div className="p-8 overflow-y-auto font-serif text-lg leading-loose text-gray-800">
                        <p className="first-letter:text-4xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:mt-[-5px]">
                            {selectedTravelogue.text}
                        </p>
                        <div className="mt-8 pt-4 border-t border-gray-300 text-sm font-sans text-gray-500 flex justify-between items-center">
                            <span>Author: {selectedTravelogue.author}, {selectedTravelogue.year}</span>
                            <a 
                                href={selectedTravelogue.sourceUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-tile-blue hover:underline flex items-center gap-1"
                            >
                                Read Full Book ↗
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;

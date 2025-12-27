// Developed by Kian Mansouri Jamshidi
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PDFReader from './components/PDFReader';
import DatabaseModal from './components/DatabaseModal';
import CitationModal from './components/CitationModal';
import IranMap from './components/IranMap';
import { View, Paper, HistoricalPeriod, ResearchTopic, SearchFilters, AppSettings, ArtWork, TravelogueChunk } from './types';
import { searchAcademicPapers, searchPersianArt } from './services/geminiService';
import { searchTravelogues } from './services/travelogueService';
import { deletePaperRecord, getAllPapers, savePaperMetadata, exportDatabase, importDatabase, openExternalLink, saveFile } from './services/storageService';
import { processAndIndexPaper, searchFullText } from './services/pdfProcessor';

// --- CONSTANTS ---
const PERIOD_LABELS: Record<HistoricalPeriod, string> = {
  [HistoricalPeriod.ALL]: 'همه',
  [HistoricalPeriod.ELAMITE_MEDES]: 'ایلام/ماد',
  [HistoricalPeriod.ACHAEMENID]: 'هخامنشی',
  [HistoricalPeriod.SELEUCID_PARTHIAN]: 'سلوکی/اشکانی',
  [HistoricalPeriod.SASSANID]: 'ساسانی',
  [HistoricalPeriod.EARLY_ISLAMIC]: 'اسلامی اولیه',
  [HistoricalPeriod.SELJUK_GHAZNAVID]: 'سلجوقی',
  [HistoricalPeriod.ILKHANID]: 'ایلخانی',
  [HistoricalPeriod.TIMURID]: 'تیموری',
  [HistoricalPeriod.SAFAVID]: 'صفویه',
  [HistoricalPeriod.AFSHARID_ZAND]: 'افشار/زند',
  [HistoricalPeriod.QAJAR]: 'قاجار',
  [HistoricalPeriod.PAHLAVI]: 'پهلوی',
  [HistoricalPeriod.CONTEMPORARY]: 'معاصر'
};

const TOPIC_LABELS: Record<ResearchTopic, string> = {
  [ResearchTopic.GENERAL]: 'عمومی',
  [ResearchTopic.GARDEN_LAYOUT]: 'هندسه و الگو',
  [ResearchTopic.QANAT_WATER]: 'قنات و آب',
  [ResearchTopic.VEGETATION]: 'گیاهان',
  [ResearchTopic.SYMBOLISM]: 'نمادشناسی',
  [ResearchTopic.PAVILIONS]: 'کوشک‌ها',
  [ResearchTopic.CONSERVATION]: 'مرمت'
};

const SOURCE_LABELS: Record<string, string> = {
    'Semantic Scholar': 'SEMANTIC',
    'CrossRef': 'CROSSREF',
    'SID': 'SID',
    'NoorMags': 'NOORMAGS',
    'Ganjoor': 'GANJOOR',
    'IranArchpedia': 'ARCHPEDIA',
    'Local': 'LOCAL'
};

// --- LOADING TRIVIA DATABASE ---
const LOADING_FACTS = [
    {
        title: "ریشه واژه پردیس",
        text: "واژه انگلیسی Paradise از واژه اوستایی «پایری‌دئزه» (Pairi-daēza) گرفته شده است."
    },
    {
        title: "کهن‌ترین چهارباغ",
        text: "باغ پاسارگاد (ساخته شده به دستور کوروش) نخستین نمونه شناخته شده از الگوی «چهارباغ» است."
    },
    {
        title: "معماری کوشک",
        text: "کوشک‌ها معمولاً در تقاطع محورهای اصلی باغ قرار می‌گیرند تا بیشترین دید منظر را داشته باشند."
    },
    {
        title: "سیستم آبیاری هوشمند",
        text: "صدای آب در باغ ایرانی نه تنها برای خنکی، بلکه برای آرامش صوتی (Soundscape) طراحی شده است."
    }
];

const App: React.FC = () => {
  // --- STATE ---
  const [currentView, setCurrentView] = useState<View>(View.SEARCH);
  const [library, setLibrary] = useState<Paper[]>([]);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [displayedLibrary, setDisplayedLibrary] = useState<Paper[]>([]);
  const [isLocalSearching, setIsLocalSearching] = useState(false);
  const [currentPaper, setCurrentPaper] = useState<Paper | null>(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [citationPaper, setCitationPaper] = useState<Paper | null>(null);
  const [paperToEdit, setPaperToEdit] = useState<Paper | null>(null);
  const [loadingLib, setLoadingLib] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({ sidebarMode: 'expanded', libraryView: 'grid', theme: 'dark' });
  const [filters, setFilters] = useState<SearchFilters>({ query: '', period: HistoricalPeriod.ALL, topic: ResearchTopic.GENERAL, useGrounding: true });
  const [searchTab, setSearchTab] = useState<'papers' | 'art'>('papers');
  const [paperResults, setPaperResults] = useState<Partial<Paper>[]>([]);
  const [artResults, setArtResults] = useState<ArtWork[]>([]);
  const [travelogueResults, setTravelogueResults] = useState<TravelogueChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('آماده‌به‌کار');
  
  // Loading Facts State
  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  // --- EFFECTS ---
  useEffect(() => {
    const loadData = async () => {
        setLoadingLib(true);
        try {
            const savedSettings = localStorage.getItem('pardis_settings');
            if (savedSettings) setSettings(JSON.parse(savedSettings));
            const storedPapers = await getAllPapers();
            setLibrary(storedPapers);
        } catch (e) { console.error(e); } finally { setLoadingLib(false); }
    };
    loadData();
  }, []);

  useEffect(() => { localStorage.setItem('pardis_settings', JSON.stringify(settings)); }, [settings]);

  // Trivia Rotation Timer
  useEffect(() => {
    let interval: any;
    if (isSearching) {
        interval = setInterval(() => {
            setCurrentFactIndex(prev => (prev + 1) % LOADING_FACTS.length);
        }, 5000); // Change fact every 5 seconds
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  useEffect(() => {
    const performLocalSearch = async () => {
        if (!librarySearchQuery.trim()) { setDisplayedLibrary(library); return; }
        setIsLocalSearching(true);
        try {
            const fullTextIds = await searchFullText(librarySearchQuery);
            const q = librarySearchQuery.toLowerCase().trim();
            const metaMatches = library.filter(p => p.title.toLowerCase().includes(q) || p.authors.some(a => a.toLowerCase().includes(q)));
            const merged = [...metaMatches];
            const metaIds = new Set(metaMatches.map(p => p.id));
            fullTextIds.forEach(id => { if(!metaIds.has(id)) { const p = library.find(x => x.id === id); if(p) merged.push(p); } });
            setDisplayedLibrary(merged);
        } catch { } finally { setIsLocalSearching(false); }
    };
    const t = setTimeout(performLocalSearch, 300);
    return () => clearTimeout(t);
  }, [librarySearchQuery, library]);

  // --- HANDLERS ---
  const toggleSidebarMode = () => setSettings(prev => ({...prev, sidebarMode: prev.sidebarMode === 'expanded' ? 'compact' : 'expanded'}));
  const setLibraryView = (view: 'grid' | 'list') => setSettings(prev => ({ ...prev, libraryView: view }));
  
  const executeSearch = async (query: string, period: HistoricalPeriod, topic: ResearchTopic) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setStatusMessage('در حال پردازش...');
    setPaperResults([]); setArtResults([]); setTravelogueResults([]);
    try {
        const [p, a, t] = await Promise.all([searchAcademicPapers(query, period, topic), searchPersianArt(query), searchTravelogues(query)]);
        setPaperResults(p); setArtResults(a); setTravelogueResults(t);
        if (p.length === 0 && a.length > 0) setSearchTab('art');
        setStatusMessage(`یافت شد: ${p.length + a.length + t.length}`);
    } catch { setStatusMessage('خطا در اتصال'); } 
    finally { setIsSearching(false); }
  };

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); executeSearch(filters.query, filters.period, filters.topic); };
  const handleMapSearch = (q: string) => { setFilters(prev => ({...prev, query: q})); setCurrentView(View.SEARCH); executeSearch(q, filters.period, filters.topic); };
  
  // --- INTELLIGENT HARVESTING SYSTEM ---
  const handleQuickAdd = async (p: Partial<Paper>) => {
      setStatusMessage('استخراج...');
      const newId = p.id || crypto.randomUUID();
      
      let newPaper: Paper = { 
          ...p, 
          id: newId, 
          title: p.title || 'بدون عنوان', 
          authors: p.authors || [], 
          year: p.year || 'نامشخص', 
          source: p.source || 'نامشخص', 
          abstract: p.abstract || '', 
          tags: [], 
          notes: [], 
          addedAt: Date.now(), 
          isLocal: false, 
          language: p.language || 'fa', 
          apiSource: p.apiSource, 
          citationCount: p.citationCount, 
          docType: 'paper',
          url: p.url
      };

      if (p.url) {
          try {
              setStatusMessage('دانلود...');
              const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(p.url);
              const response = await fetch(proxyUrl);
              const contentType = response.headers.get('content-type');
              
              if (response.ok && (contentType?.includes('application/pdf') || p.url.endsWith('.pdf'))) {
                  const blob = await response.blob();
                  const file = new File([blob], `${newPaper.title}.pdf`, { type: 'application/pdf' });
                  await saveFile(newId, file);
                  setStatusMessage('نمایه‌سازی...');
                  await processAndIndexPaper(newId, newPaper.title, newPaper.authors, file);
                  newPaper.isLocal = true;
                  setStatusMessage('ذخیره شد');
              } else {
                  setStatusMessage('لینک ذخیره شد');
              }
          } catch (e) {
              setStatusMessage('ذخیره لینک');
          }
      } else {
          setStatusMessage('ذخیره متادیتا');
      }

      await savePaperMetadata(newPaper); 
      setLibrary(prev => [newPaper, ...prev]); 
  };

  const handleQuickAddArt = async (a: ArtWork) => {
      const newP: Paper = { id: `art-${a.id}`, title: a.title, authors: [a.artist], year: a.date||'N/A', source: a.department||'Gallery', abstract: `${a.medium}`, url: a.museumUrl, thumbnailUrl: a.highResUrl||a.imageUrl, docType: 'artwork', tags: ['Art'], notes: [], addedAt: Date.now(), isLocal: false, language: 'en', apiSource: 'Local' };
      await savePaperMetadata(newP); setLibrary(prev => [newP, ...prev]); setStatusMessage('تصویر نمایه شد');
  };

  const handleDeletePaper = async (id: string, e: React.MouseEvent) => { e.stopPropagation(); if(confirm('حذف شود؟')) { await deletePaperRecord(id); setLibrary(prev => prev.filter(p => p.id !== id)); setStatusMessage('حذف شد'); } };
  const handleSaveDbRecord = async (p: Paper) => { await savePaperMetadata(p); setLibrary(prev => { const idx = prev.findIndex(x => x.id === p.id); if(idx !== -1) { const c = [...prev]; c[idx] = p; return c;} return [p, ...prev]; }); setStatusMessage('ذخیره شد'); };
  
  const handleExport = async () => {
    const data = await exportDatabase();
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pardis-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
          try {
             const items = await importDatabase(ev.target?.result as string);
             setLibrary(items);
             alert('بازگردانی انجام شد');
          } catch(err) { alert('فایل نامعتبر است'); }
      };
      reader.readAsText(file);
  };

  // --- RENDER ---
  return (
    <div className="flex h-[100dvh] font-sans relative bg-[#0B0F12] text-text-primary overflow-hidden">
      <div className="particle-bg z-0"></div>
      
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView}
        savedCount={library.length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        mode={settings.sidebarMode}
        onToggleMode={toggleSidebarMode}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative z-10 w-full md:pl-0">
        
        {/* Top Header - Glass Strip (Sticky on Mobile) */}
        {currentView !== View.READER && (
            <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 shrink-0 z-20 bg-[#0B0F12]/80 backdrop-blur-md border-b border-white/5 sticky top-0">
                <div className="flex items-center gap-3 md:gap-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-text-primary p-1">
                         {/* Hamburger Icon */}
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                    <h2 className="text-lg md:text-xl font-nastaliq text-gold-primary drop-shadow-md pt-1.5 md:pt-2">
                        {currentView === View.SEARCH && 'کاوشگر منابع'}
                        {currentView === View.ATLAS && 'اطلس مکانی'}
                        {currentView === View.LIBRARY && 'آرشیو دیجیتال'}
                        {currentView === View.TIMELINE && 'خط زمان'}
                        {currentView === View.SETTINGS && 'تنظیمات'}
                    </h2>
                </div>
                <div className="flex items-center gap-2 glass-panel px-3 py-1 rounded-full border border-white/5">
                    <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isSearching ? 'bg-gold-primary animate-pulse' : 'bg-teal-glow'}`}></span>
                    <span className="text-[10px] md:text-xs text-text-muted font-medium truncate max-w-[100px] md:max-w-none">{statusMessage}</span>
                </div>
            </header>
        )}

        {/* Content Area */}
        <div className={`flex-1 overflow-hidden relative ${currentView !== View.READER ? 'p-3 md:p-6' : 'p-0'}`}>
            
            {/* VIEW: SEARCH (The Aggregator) */}
            {currentView === View.SEARCH && (
                <div className="h-full flex flex-col gap-4 md:gap-6 max-w-7xl mx-auto">
                    {/* Search Bar Container */}
                    <div className="glass-panel p-4 md:p-6 shrink-0 relative overflow-hidden rounded-2xl border-white/10">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-glow opacity-5 rounded-full blur-2xl pointer-events-none"></div>
                        
                        <form onSubmit={handleSearchSubmit} className="relative z-10 flex flex-col gap-3 md:gap-4">
                            <div className="flex gap-2 relative">
                                <div className="relative flex-1">
                                     <input 
                                        type="text" 
                                        value={filters.query}
                                        onChange={e => setFilters({...filters, query: e.target.value})}
                                        placeholder="جستجوی موضوعی..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-3 pr-10 py-3 md:px-5 md:py-4 text-sm md:text-lg text-text-primary placeholder-gray-500 focus:border-teal-glow/50 focus:ring-0 transition-colors"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                                </div>
                                <button type="submit" disabled={isSearching} className="px-4 md:px-6 bg-teal-glow/10 hover:bg-teal-glow/20 text-teal-glow rounded-xl border border-teal-glow/30 transition-all font-bold disabled:opacity-50 flex items-center justify-center min-w-[50px]">
                                    <span className="md:hidden text-xl">➜</span>
                                    <span className="hidden md:inline">کاوش</span>
                                </button>
                            </div>
                            
                            {/* Scrollable Filters */}
                            <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide mask-fade-sides -mx-4 px-4 md:mx-0 md:px-0">
                                {Object.values(HistoricalPeriod).map(p => (
                                    <button 
                                        key={p} 
                                        type="button"
                                        onClick={() => setFilters({...filters, period: p})}
                                        className={`text-[10px] md:text-xs px-3 py-1.5 rounded-full border transition-all whitespace-nowrap shrink-0 ${filters.period === p ? 'bg-gold-primary/20 border-gold-primary text-gold-primary' : 'bg-white/5 border-white/5 text-gray-400'}`}
                                    >
                                        {PERIOD_LABELS[p]}
                                    </button>
                                ))}
                            </div>
                        </form>
                    </div>

                    {/* LOADING STATE */}
                    {isSearching ? (
                        <div className="flex-1 flex flex-col items-center justify-center relative glass-panel rounded-2xl border-white/5">
                            <div className="w-12 h-12 relative mb-6">
                                <div className="absolute inset-0 border-4 border-t-teal-glow border-r-transparent border-b-gold-primary border-l-transparent rounded-full animate-spin"></div>
                            </div>
                            <h3 className="text-gold-primary font-nastaliq text-xl mb-3 text-center px-4">
                                {LOADING_FACTS[currentFactIndex].title}
                            </h3>
                            <p className="text-gray-400 text-sm text-center px-8 leading-relaxed max-w-md">
                                {LOADING_FACTS[currentFactIndex].text}
                            </p>
                        </div>
                    ) : (
                    /* Results Grid */
                    <div className="flex-1 overflow-y-auto pb-16 md:pb-10 scrollbar-thin">
                         <div className="flex gap-4 mb-4 border-b border-white/5 pb-2 px-1 sticky top-0 bg-[#0B0F12] z-10 pt-2">
                             <button onClick={() => setSearchTab('papers')} className={`pb-2 text-xs md:text-sm transition-colors relative ${searchTab === 'papers' ? 'text-white' : 'text-gray-600'}`}>
                                 منابع متنی <span className="text-[10px] ml-1 opacity-60">({paperResults.length})</span>
                                 {searchTab === 'papers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-glow rounded-full"></div>}
                             </button>
                             <button onClick={() => setSearchTab('art')} className={`pb-2 text-xs md:text-sm transition-colors relative ${searchTab === 'art' ? 'text-white' : 'text-gray-600'}`}>
                                 نگارگری <span className="text-[10px] ml-1 opacity-60">({artResults.length})</span>
                                 {searchTab === 'art' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-primary rounded-full"></div>}
                             </button>
                         </div>

                         {/* Mobile: 1 col, Desktop: 2-3 cols */}
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                             {searchTab === 'papers' && paperResults.map((p, i) => (
                                 <div key={i} className="glass-panel p-4 border-white/5 hover:border-teal-glow/30 transition-all group flex flex-col bg-[#151a21]">
                                     <div className="flex justify-between items-start mb-2">
                                         <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5 uppercase tracking-wider">
                                             {SOURCE_LABELS[p.apiSource || ''] || 'Web'}
                                         </span>
                                         <span className="text-[10px] text-gray-500 font-mono">{p.year}</span>
                                     </div>
                                     <h3 className="font-bold text-text-primary text-sm mb-2 leading-6 group-hover:text-teal-glow transition-colors">{p.title}</h3>
                                     <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">{p.abstract}</p>
                                     <div className="flex justify-between items-center mt-auto border-t border-white/5 pt-3">
                                         <span className="text-[10px] text-gray-600 truncate max-w-[120px]">{p.authors?.join('، ')}</span>
                                         <button onClick={() => handleQuickAdd(p)} className="text-teal-glow bg-teal-glow/10 p-2 rounded-lg hover:bg-teal-glow hover:text-black transition-colors flex items-center gap-1">
                                             <span className="text-xs font-bold">+</span>
                                             <span className="text-[10px]">افزودن</span>
                                         </button>
                                     </div>
                                 </div>
                             ))}

                            {searchTab === 'art' && artResults.map((a) => (
                                 <div key={a.id} className="glass-panel p-0 overflow-hidden group bg-[#151a21] border-white/5">
                                     <div className="relative aspect-square">
                                         <img src={a.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80"></div>
                                         <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <h3 className="text-xs font-bold text-white mb-0.5 truncate">{a.title}</h3>
                                            <p className="text-[10px] text-gold-primary">{a.period}</p>
                                         </div>
                                         <button onClick={() => handleQuickAddArt(a)} className="absolute top-2 right-2 bg-gold-primary text-black w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10">
                                             +
                                         </button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                    )}
                </div>
            )}

            {/* VIEW: ATLAS */}
            {currentView === View.ATLAS && <IranMap onProvinceSelect={handleMapSearch} />}

            {/* VIEW: LIBRARY */}
            {currentView === View.LIBRARY && (
                <div className="h-full flex flex-col gap-4">
                    <div className="glass-panel p-3 md:p-4 flex justify-between items-center shrink-0 rounded-xl border-white/10">
                        <input 
                            type="text" 
                            value={librarySearchQuery}
                            onChange={e => setLibrarySearchQuery(e.target.value)}
                            placeholder="جستجو در آرشیو..."
                            className="bg-transparent border-none text-white focus:ring-0 w-full placeholder-gray-600 text-sm"
                        />
                        <button onClick={() => {setPaperToEdit(null); setIsDbModalOpen(true);}} className="bg-gold-primary/10 text-gold-primary px-3 py-1.5 rounded-lg text-xs font-bold border border-gold-primary/30 hover:bg-gold-primary hover:text-black transition-colors shrink-0 flex items-center gap-1">
                            <span>+</span> <span className="hidden sm:inline">سند جدید</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-20 md:pb-10 scrollbar-thin">
                        {displayedLibrary.map(p => (
                            <div key={p.id} onClick={() => {setCurrentPaper(p); setCurrentView(View.READER);}} className="glass-panel p-0 cursor-pointer group hover:border-gold-primary/30 transition-all flex flex-col bg-[#151a21] border-white/5">
                                <div className="h-32 bg-black/40 relative overflow-hidden border-b border-white/5">
                                    {p.thumbnailUrl ? (
                                        <img src={p.thumbnailUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="text-4xl opacity-10 grayscale">📄</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded border backdrop-blur-sm ${p.isLocal ? 'bg-teal-glow/10 border-teal-glow text-teal-glow' : 'bg-gray-800/50 border-gray-600 text-gray-400'}`}>
                                            {p.isLocal ? 'PDF' : 'META'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h3 className="text-xs font-bold text-text-primary mb-1 line-clamp-2 leading-5">{p.title}</h3>
                                    <div className="mt-auto flex justify-between items-center text-[9px] text-gray-500 pt-2 border-t border-white/5">
                                        <span>{p.year}</span>
                                        <button onClick={(e) => handleDeletePaper(p.id, e)} className="hover:text-red-400 p-1">🗑</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VIEW: TIMELINE */}
            {currentView === View.TIMELINE && (
                <div className="h-full overflow-y-auto px-4 pb-20 relative">
                    <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold-primary/30 to-transparent"></div>
                    
                    {Object.values(HistoricalPeriod).map((period, index) => {
                         const papers = library.filter(p => p.period === period);
                         if (papers.length === 0) return null;
                         return (
                             <div key={period} className={`flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 mb-8 md:mb-12 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                                 {/* Mobile Alignment Fix */}
                                 <div className="pl-6 md:pl-0 w-full md:w-1/2 text-right">
                                     <div className="glass-panel p-4 inline-block w-full md:w-auto md:max-w-sm hover:border-gold-primary/50 transition-colors bg-[#151a21]">
                                         <h3 className="text-gold-primary font-nastaliq text-lg mb-2 drop-shadow-sm">{PERIOD_LABELS[period]}</h3>
                                         <div className="space-y-2">
                                             {papers.map(p => (
                                                 <div key={p.id} onClick={() => {setCurrentPaper(p); setCurrentView(View.READER);}} className="text-xs text-gray-400 hover:text-white cursor-pointer truncate border-b border-white/5 pb-1 last:border-0">
                                                     {p.title}
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 </div>
                                 <div className="absolute left-[13px] md:relative md:left-auto md:z-10 flex flex-col items-center justify-center">
                                     <div className="w-2.5 h-2.5 bg-black border border-gold-primary rounded-full shadow-glow-gold"></div>
                                 </div>
                                 <div className="hidden md:block w-1/2"></div>
                             </div>
                         )
                    })}
                </div>
            )}

            {/* VIEW: SETTINGS */}
            {currentView === View.SETTINGS && (
                <div className="h-full overflow-y-auto max-w-4xl mx-auto space-y-6 md:space-y-8 pb-20">
                    <div className="glass-panel p-6 md:p-8">
                        <h2 className="text-xl md:text-2xl font-nastaliq text-gold-primary mb-6 border-b border-white/10 pb-4">تنظیمات سیستم</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-text-primary">داده‌ها</h3>
                                <div className="flex gap-2">
                                    <button onClick={handleExport} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 rounded-lg text-xs transition-colors">
                                        پشتیبان‌گیری
                                    </button>
                                    <label className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 rounded-lg text-xs transition-colors text-center cursor-pointer">
                                        بازگردانی
                                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CREDITS / TEAM SECTION */}
                    <div className="glass-panel p-6 md:p-8 text-center relative overflow-hidden border border-gold-primary/20">
                         <div className="absolute inset-0 bg-gold-primary/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
                         
                         <h3 className="text-gold-primary font-nastaliq text-xl mb-6 drop-shadow-sm">تیم پژوهش و توسعه سامانه</h3>
                         
                         <div className="space-y-5 font-sans">
                             <div className="flex flex-col items-center">
                                 <span className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">توسعه دهنده نرم‌افزار</span>
                                 <span className="text-lg text-white font-bold">کیان منصوری جمشیدی</span>
                             </div>

                             <div className="flex flex-col items-center">
                                 <span className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">استاد راهنما</span>
                                 <span className="text-base text-teal-glow font-bold">دکتر حمیدرضا جیحانی</span>
                             </div>

                             <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto my-4"></div>

                             <div className="grid grid-cols-3 gap-4 text-xs text-gray-400">
                                 <div>
                                     <span className="block text-gold-primary/60 mb-1 font-medium">درس</span>
                                     باغ ایرانی
                                 </div>
                                 <div>
                                     <span className="block text-gold-primary/60 mb-1 font-medium">دانشگاه</span>
                                     شهید بهشتی
                                 </div>
                                 <div>
                                     <span className="block text-gold-primary/60 mb-1 font-medium">سال تحصیلی</span>
                                     ۱۴۰۴ - ۲۰۲۵
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            )}

            {/* PDF READER OVERLAY */}
            {currentView === View.READER && (
                <PDFReader 
                    paper={currentPaper} 
                    onUpdateNote={() => {}} 
                    onClose={() => setCurrentView(View.LIBRARY)}
                    onToggleSidebar={() => setIsSidebarOpen(true)}
                />
            )}

            <DatabaseModal isOpen={isDbModalOpen} onClose={() => setIsDbModalOpen(false)} onSave={handleSaveDbRecord} initialData={paperToEdit} />
            <CitationModal paper={citationPaper} onClose={() => setCitationPaper(null)} />
        </div>
      </main>
    </div>
  );
};

export default App;
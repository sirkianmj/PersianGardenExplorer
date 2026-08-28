import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PDFReader from './components/PDFReader';
import DatabaseModal from './components/DatabaseModal';
import CitationModal from './components/CitationModal';
import IranMap from './components/IranMap';
import ArtDetailModal from './components/ArtDetailModal';
import ArtworkImage from './components/ArtworkImage';
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
  const [filters, setFilters] = useState<SearchFilters>({ 
      query: '', 
      period: HistoricalPeriod.ALL, 
      topic: ResearchTopic.GENERAL, 
      useGrounding: true,
      forceGardenContext: true // Default to true for a specialized engine
  });
  
  const [searchTab, setSearchTab] = useState<'papers' | 'art' | 'travelogues' | 'literature'>('papers');
  const [paperResults, setPaperResults] = useState<Partial<Paper>[]>([]);
  const [artResults, setArtResults] = useState<ArtWork[]>([]);
  const [travelogueResults, setTravelogueResults] = useState<TravelogueChunk[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtWork | null>(null);
  const [isArtModalOpen, setIsArtModalOpen] = useState(false);
  // const [ganjoorResults, setGanjoorResults] = useState<Partial<Paper>[]>([]); // Hidden
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
            
            // Initial rich discovery loading
            executeSearch('باغ ایرانی', HistoricalPeriod.ALL, ResearchTopic.GENERAL, true);
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
  
  const executeSearch = async (query: string, period: HistoricalPeriod, topic: ResearchTopic, forceGarden: boolean) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setStatusMessage('در حال پردازش...');
    setPaperResults([]); setArtResults([]); setTravelogueResults([]); 
    // setGanjoorResults([]); // Hidden
    try {
        const [p, a, t] = await Promise.all([
            searchAcademicPapers(query, period, topic, forceGarden), 
            searchPersianArt(query, period, forceGarden), 
            searchTravelogues(query), 
            // searchLiterature(query, forceGarden) // Hidden
        ]);
        setPaperResults(p); setArtResults(a); setTravelogueResults(t); // setGanjoorResults(l);
        
        // Auto-switch tabs if results found in specific categories
        if (p.length === 0 && t.length > 0) setSearchTab('travelogues');
        else if (p.length === 0 && a.length > 0) setSearchTab('art');
        else setSearchTab('papers');

        setStatusMessage(`یافت شد: ${p.length + a.length + t.length}`);
    } catch { setStatusMessage('خطا در اتصال'); } 
    finally { setIsSearching(false); }
  };

  const handleSearchSubmit = (e: React.FormEvent) => { 
      e.preventDefault(); 
      executeSearch(filters.query, filters.period, filters.topic, filters.forceGardenContext); 
  };
  const handleMapSearch = (q: string) => { 
      setFilters(prev => ({...prev, query: q})); 
      setCurrentView(View.SEARCH); 
      executeSearch(q, filters.period, filters.topic, filters.forceGardenContext); 
  };
  
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
      const isPdf = !!(
        a.isPdf || 
        a.pdfUrl || 
        a.highResUrl?.toLowerCase().endsWith('.pdf') || 
        a.medium?.includes('PDF')
      );
      const targetPdfUrl = a.pdfUrl || (a.highResUrl?.toLowerCase().endsWith('.pdf') ? a.highResUrl : undefined);
      const newId = `art-${a.id}-${Date.now()}`;
      
      const newP: Paper = { 
          id: newId, 
          title: a.title, 
          authors: [a.artist || 'هنرمند ایرانی'], 
          year: a.date || 'تاریخی', 
          period: a.period as any,
          source: a.department || 'آرشیو نگارگری و موزه‌های جهانی', 
          abstract: `${a.description ? a.description + '\n' : ''}${a.medium || 'نگارگری و مینیاتور ایرانی'} | ${a.period || ''}`, 
          url: targetPdfUrl || a.museumUrl || a.highResUrl || a.imageUrl, 
          pdfUrl: targetPdfUrl,
          thumbnailUrl: a.imageUrl || a.highResUrl, 
          docType: 'artwork', 
          isPdf: isPdf,
          tags: ['Art', isPdf ? 'PDF' : 'Miniature', isPdf ? 'سند خطی' : 'نگارگری', a.period || ''], 
          notes: [], 
          addedAt: Date.now(), 
          isLocal: false, 
          language: 'fa', 
          apiSource: 'Local' 
      };

      if (isPdf && targetPdfUrl) {
          try {
              setStatusMessage('دانلود سند PDF...');
              const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(targetPdfUrl);
              const response = await fetch(proxyUrl);
              if (response.ok) {
                  const blob = await response.blob();
                  const file = new File([blob], `${newP.title}.pdf`, { type: 'application/pdf' });
                  await saveFile(newId, file);
                  await processAndIndexPaper(newId, newP.title, newP.authors, file);
                  newP.isLocal = true;
              }
          } catch {
              // fallback to remote url
          }
      }

      await savePaperMetadata(newP); 
      setLibrary(prev => [newP, ...prev]); 
      setStatusMessage(isPdf ? 'سند PDF در کتابخانه ذخیره شد' : 'شاهکار به کتابخانه ذخیره شد');
  };

  const handleOpenArtInReader = (a: ArtWork) => {
    const isPdf = !!(
      a.isPdf || 
      a.pdfUrl || 
      a.highResUrl?.toLowerCase().endsWith('.pdf') || 
      a.medium?.includes('PDF')
    );
    const targetPdfUrl = a.pdfUrl || (a.highResUrl?.toLowerCase().endsWith('.pdf') ? a.highResUrl : undefined);

    const paperObj: Paper = {
      id: `art-${a.id}-${Date.now()}`,
      title: a.title,
      authors: [a.artist || 'هنرمند ایرانی'],
      year: a.date || 'تاریخی',
      period: a.period as any,
      source: a.department || 'آرشیو نگارگری و اسناد تاریخی',
      abstract: `${a.description ? a.description + '\n' : ''}${a.medium || 'سند تاریخی'} | ${a.period || ''}`,
      url: targetPdfUrl || a.museumUrl || a.highResUrl || a.imageUrl,
      pdfUrl: targetPdfUrl,
      thumbnailUrl: a.imageUrl || a.highResUrl,
      docType: 'artwork',
      isPdf: isPdf,
      tags: ['Art', isPdf ? 'PDF' : 'Miniature', isPdf ? 'سند خطی' : 'نگارگری', a.period || ''],
      notes: [],
      addedAt: Date.now(),
      isLocal: false,
      language: 'fa',
      apiSource: 'Local'
    };

    setCurrentPaper(paperObj);
    setCurrentView(View.READER);
  };

  const handleQuickAddTravelogue = async (t: TravelogueChunk) => {
      const newP: Paper = { 
          id: `travel-${t.id}-${Date.now()}`,
          title: t.bookTitle, 
          authors: [t.author], 
          year: t.year, 
          source: 'Historical Travelogue', 
          abstract: t.text || t.excerpt, // Save full text if available in 'text' field, otherwise excerpt
          url: t.sourceUrl, 
          docType: 'travelogue', 
          tags: ['Travelogue', 'Historical', t.location], 
          notes: [], 
          addedAt: Date.now(), 
          isLocal: false, 
          language: 'en', 
          apiSource: 'Local' 
      };
      await savePaperMetadata(newP); 
      setLibrary(prev => [newP, ...prev]); 
      setStatusMessage('سفرنامه ذخیره شد');
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
                        {currentView === View.LIBRARY && 'کتابخانه دیجیتال'}
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
                                {/* Search Input Wrapper */}
                                <div className="relative flex-1 flex items-center bg-black/40 border border-white/10 rounded-xl focus-within:border-teal-glow/50 transition-colors">
                                     <input 
                                        type="text" 
                                        value={filters.query}
                                        onChange={e => setFilters({...filters, query: e.target.value})}
                                        placeholder="جستجوی موضوعی..."
                                        className="bg-transparent border-none w-full pl-3 pr-10 py-3 md:px-5 md:py-4 text-sm md:text-lg text-text-primary placeholder-gray-500 focus:ring-0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                                    
                                    {/* Force Garden Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setFilters(prev => ({...prev, forceGardenContext: !prev.forceGardenContext}))}
                                        className={`ml-2 mr-2 md:ml-3 md:mr-3 p-2 rounded-lg transition-all border flex items-center gap-1 ${filters.forceGardenContext 
                                            ? 'bg-green-500/10 border-green-500 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]' 
                                            : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'}`}
                                        title={filters.forceGardenContext ? "محدود به باغ ایرانی (فعال)" : "جستجوی آزاد (غیرفعال)"}
                                    >
                                        <span className="text-lg leading-none">🍃</span>
                                        <span className="text-[10px] font-bold hidden md:inline">{filters.forceGardenContext ? 'ON' : 'OFF'}</span>
                                    </button>
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
                         <div className="flex gap-4 mb-4 border-b border-white/5 pb-2 px-1 sticky top-0 bg-[#0B0F12] z-10 pt-2 overflow-x-auto scrollbar-hide">
                             <button onClick={() => setSearchTab('papers')} className={`pb-2 text-xs md:text-sm transition-colors relative whitespace-nowrap ${searchTab === 'papers' ? 'text-white' : 'text-gray-600'}`}>
                                 منابع متنی <span className="text-[10px] ml-1 opacity-60">({paperResults.length})</span>
                                 {searchTab === 'papers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-glow rounded-full"></div>}
                             </button>
                             <button onClick={() => setSearchTab('art')} className={`pb-2 text-xs md:text-sm transition-colors relative whitespace-nowrap ${searchTab === 'art' ? 'text-white' : 'text-gray-600'}`}>
                                 نگارگری <span className="text-[10px] ml-1 opacity-60">({artResults.length})</span>
                                 {searchTab === 'art' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-primary rounded-full"></div>}
                             </button>
                             <button onClick={() => setSearchTab('travelogues')} className={`pb-2 text-xs md:text-sm transition-colors relative whitespace-nowrap ${searchTab === 'travelogues' ? 'text-white' : 'text-gray-600'}`}>
                                 سفرنامه‌ها <span className="text-[10px] ml-1 opacity-60">({travelogueResults.length})</span>
                                 {searchTab === 'travelogues' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full"></div>}
                             </button>
                             {/* Ganjoor Tab Hidden */}
                         </div>

                         {/* Mobile: 1 col, Desktop: 2-3 cols */}
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                             {/* ACADEMIC PAPERS */}
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

                            {/* ART & MUSEUM */}
                            {searchTab === 'art' && (
                                <div className="col-span-full space-y-4">
                                    {/* Curated Art Filter Tags */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                                        <span className="text-gray-400 text-[11px] shrink-0 font-nastaliq text-gold-primary">فیلترهای سریع مکاتب:</span>
                                        {[
                                            { label: 'همه شاهکارها', q: 'نگارگری باغ' },
                                            { label: 'دوره صفوی', q: 'صفوی نگارگری باغ' },
                                            { label: 'دوره تیموری', q: 'تیموری نگارگری بهزاد' },
                                            { label: 'دوره قاجار', q: 'قاجار باغ گل و مرغ' },
                                            { label: 'شاهنامه شاه‌طهماسب', q: 'شاهنامه شاه طهماسب' },
                                            { label: 'باغ فین کاشان', q: 'باغ فین کاشان' },
                                            { label: 'باغ ارم شیراز', q: 'باغ ارم شیراز' },
                                            { label: 'مکتب هرات', q: 'مکتب هرات کمال الدین بهزاد' },
                                            { label: 'مکتب اصفهان', q: 'مکتب اصفهان رضا عباسی' }
                                        ].map((chip, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setFilters(prev => ({ ...prev, query: chip.q }));
                                                    executeSearch(chip.q, filters.period, filters.topic, filters.forceGardenContext);
                                                }}
                                                className="shrink-0 px-2.5 py-1 rounded-full bg-white/5 hover:bg-gold-primary/20 hover:text-gold-primary text-gray-300 border border-white/10 hover:border-gold-primary/40 transition-all text-[11px]"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>

                                    {artResults.length === 0 ? (
                                        <div className="text-center py-12 glass-panel border-white/5">
                                            <p className="text-gray-400 text-sm mb-3">در حال جستجوی نگاره‌های تاریخی یا نتیجه‌ای یافت نشد.</p>
                                            <button
                                                type="button"
                                                onClick={() => executeSearch('نگارگری باغ ایرانی', HistoricalPeriod.ALL, ResearchTopic.GENERAL, true)}
                                                className="px-4 py-2 rounded-lg bg-gold-primary/20 text-gold-primary border border-gold-primary/40 hover:bg-gold-primary hover:text-black transition-all text-xs font-bold"
                                            >
                                                بارگذاری نگاره‌های شاهکار ایرانی
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {artResults.map((a) => {
                                                const isPdf = !!(
                                                    a.isPdf || 
                                                    a.pdfUrl || 
                                                    a.highResUrl?.toLowerCase().endsWith('.pdf') || 
                                                    a.medium?.includes('PDF')
                                                );

                                                return (
                                                    <div 
                                                        key={a.id} 
                                                        onClick={() => {
                                                            setSelectedArtwork(a);
                                                            setIsArtModalOpen(true);
                                                        }}
                                                        className={`glass-panel p-0 overflow-hidden group bg-[#151a21] transition-all duration-300 cursor-pointer flex flex-col shadow-lg rounded-xl ${
                                                            isPdf 
                                                                ? 'border-teal-glow/30 hover:border-teal-glow shadow-teal-glow/10' 
                                                                : 'border-white/10 hover:border-gold-primary/50 hover:shadow-gold-primary/10'
                                                        }`}
                                                    >
                                                        <div className="relative aspect-[4/3] bg-black/60 overflow-hidden">
                                                            <ArtworkImage
                                                                src={a.imageUrl}
                                                                fallbackSrc={a.highResUrl}
                                                                alt={a.title}
                                                                title={a.title}
                                                                artist={a.artist}
                                                                period={a.period}
                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108 group-hover:brightness-105"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#151a21] via-transparent to-black/40 opacity-80 group-hover:opacity-60 transition-opacity pointer-events-none"></div>
                                                            
                                                            {/* Top Badges */}
                                                            <div className="absolute top-2 left-2 right-2 flex justify-between items-center pointer-events-none">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-black/70 text-gold-primary border border-gold-primary/30 backdrop-blur-md">
                                                                        {a.period || 'نگاره کهن'}
                                                                    </span>
                                                                    {isPdf && (
                                                                        <span className="text-[9px] px-2 py-0.5 rounded-md bg-teal-500/80 text-white font-bold backdrop-blur-md border border-teal-300/40">
                                                                            📄 سند PDF
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-1">
                                                                    {isPdf && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleOpenArtInReader(a);
                                                                            }}
                                                                            title="ورق‌زدن و مطالعه در کتابخوان"
                                                                            className="pointer-events-auto bg-teal-glow hover:bg-teal-300 text-black w-7 h-7 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform font-bold text-xs"
                                                                        >
                                                                            📖
                                                                        </button>
                                                                    )}
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleQuickAddArt(a);
                                                                        }} 
                                                                        title="افزودن به کتابخانه پژوهشی"
                                                                        className="pointer-events-auto bg-gold-primary hover:bg-yellow-400 text-black w-7 h-7 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform font-bold text-sm"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Hover Zoom / Read Prompt */}
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                <span className="px-3 py-1.5 rounded-full bg-black/80 text-white text-[11px] backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-xl">
                                                                    <span>{isPdf ? '📖' : '🔍'}</span> {isPdf ? 'مطالعه و ورق‌زدن PDF' : 'مشاهده و بزرگ‌نمایی'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="p-3 flex-1 flex flex-col justify-between">
                                                            <div>
                                                                <h3 className="text-xs font-bold text-text-primary mb-1 line-clamp-1 group-hover:text-gold-primary transition-colors">
                                                                    {a.title}
                                                                </h3>
                                                                <p className="text-[11px] text-gray-400 line-clamp-1 mb-1">
                                                                    {a.artist || 'هنرمند ایرانی'}
                                                                </p>
                                                            </div>
                                                            <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500">
                                                                <span className="truncate max-w-[150px]">{a.department || 'آرشیو هنر ایرانی'}</span>
                                                                <span className="text-gold-primary/80 text-[10px]">{a.date || (isPdf ? 'سند چاپی' : '')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                             {/* TRAVELOGUES */}
                             {searchTab === 'travelogues' && travelogueResults.map((t) => (
                                 <div key={t.id} className="glass-panel p-4 border-white/5 hover:border-blue-400/30 transition-all group flex flex-col bg-[#151a21]">
                                     <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                              <span className="text-lg">📜</span>
                                              <span className="text-[10px] text-gold-primary font-bold">{t.year}</span>
                                          </div>
                                         <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase tracking-wider">
                                             {t.location}
                                         </span>
                                     </div>
                                     <h3 className="font-bold text-text-primary text-sm mb-1 leading-6 group-hover:text-blue-300 transition-colors font-serif ltr text-left">
                                         {t.bookTitle}
                                     </h3>
                                     <h4 className="text-xs text-gray-400 mb-3 font-serif italic ltr text-left">
                                         by {t.author}
                                     </h4>
                                     
                                     <div className="bg-black/30 p-2 rounded-lg border border-white/5 mb-3">
                                         <p className="text-[11px] text-gray-300 leading-relaxed font-serif ltr text-left italic">
                                             "{t.excerpt}"
                                         </p>
                                     </div>

                                     <div className="flex justify-between items-center mt-auto border-t border-white/5 pt-3">
                                         <div className="flex gap-2">
                                            <button 
                                                onClick={() => openExternalLink(t.sourceUrl)}
                                                className="text-blue-300 bg-blue-500/10 p-2 rounded-lg hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-1"
                                            >
                                                <span className="text-[10px]">منبع</span>
                                                <span className="text-xs">↗</span>
                                            </button>
                                            <button 
                                                onClick={() => handleQuickAddTravelogue(t)} 
                                                className="text-teal-glow bg-teal-glow/10 p-2 rounded-lg hover:bg-teal-glow hover:text-black transition-colors flex items-center gap-1"
                                            >
                                                <span className="text-xs font-bold">+</span>
                                                <span className="text-[10px]">افزودن</span>
                                            </button>
                                         </div>
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
                                        <div className={`w-full h-full flex items-center justify-center flex-col gap-2 ${p.docType === 'travelogue' ? 'bg-[#1a1510]' : ''}`}>
                                            <span className="text-4xl opacity-10 grayscale">
                                                {p.docType === 'travelogue' ? '📜' : '📄'}
                                            </span>
                                            {p.docType === 'travelogue' && <span className="text-[10px] text-gray-500 opacity-50 font-serif">Travelogue</span>}
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded border backdrop-blur-sm ${p.isLocal ? 'bg-teal-glow/10 border-teal-glow text-teal-glow' : 'bg-gray-800/50 border-gray-600 text-gray-400'}`}>
                                            {p.isLocal ? 'PDF' : (p.docType === 'travelogue' ? 'TEXT' : 'META')}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h3 className={`text-xs font-bold text-text-primary mb-1 line-clamp-2 leading-5 ${p.docType === 'travelogue' ? 'font-serif ltr text-left' : ''}`}>{p.title}</h3>
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
                                 <span className="text-base text-teal-glow font-bold">دکتر جیحانی</span>
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
            <ArtDetailModal 
                isOpen={isArtModalOpen} 
                artwork={selectedArtwork} 
                onClose={() => {
                    setIsArtModalOpen(false);
                    setSelectedArtwork(null);
                }} 
                onAddToLibrary={handleQuickAddArt} 
                onOpenInReader={handleOpenArtInReader}
            />
        </div>
      </main>
    </div>
  );
};

export default App;
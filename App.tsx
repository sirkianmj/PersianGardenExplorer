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
  [HistoricalPeriod.ALL]: 'همه دوره‌ها',
  [HistoricalPeriod.ELAMITE_MEDES]: 'ایلامیان و مادها',
  [HistoricalPeriod.ACHAEMENID]: 'هخامنشیان',
  [HistoricalPeriod.SELEUCID_PARTHIAN]: 'سلوکیان و اشکانیان',
  [HistoricalPeriod.SASSANID]: 'ساسانیان',
  [HistoricalPeriod.EARLY_ISLAMIC]: 'سده‌های اولیه اسلامی',
  [HistoricalPeriod.SELJUK_GHAZNAVID]: 'سلجوقیان و غزنویان',
  [HistoricalPeriod.ILKHANID]: 'ایلخانیان',
  [HistoricalPeriod.TIMURID]: 'تیموریان',
  [HistoricalPeriod.SAFAVID]: 'صفویه',
  [HistoricalPeriod.AFSHARID_ZAND]: 'افشاریه و زندیه',
  [HistoricalPeriod.QAJAR]: 'قاجار',
  [HistoricalPeriod.PAHLAVI]: 'پهلوی',
  [HistoricalPeriod.CONTEMPORARY]: 'معاصر'
};

const TOPIC_LABELS: Record<ResearchTopic, string> = {
  [ResearchTopic.GENERAL]: 'تاریخ عمومی',
  [ResearchTopic.GARDEN_LAYOUT]: 'هندسه و الگوی باغ',
  [ResearchTopic.QANAT_WATER]: 'قنات و آب',
  [ResearchTopic.VEGETATION]: 'پوشش گیاهی',
  [ResearchTopic.SYMBOLISM]: 'نمادشناسی',
  [ResearchTopic.PAVILIONS]: 'کوشک‌ها',
  [ResearchTopic.CONSERVATION]: 'مرمت و حفاظت'
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
        text: "آیا می‌دانستید واژه انگلیسی Paradise از واژه اوستایی «پایری‌دئزه» (Pairi-daēza) گرفته شده است؟ این واژه به معنای «باغ محصور» یا فضای دیوارکشی شده است که بعدها به معنای بهشت در زبان‌های اروپایی وارد شد."
    },
    {
        title: "کهن‌ترین چهارباغ",
        text: "باغ پاسارگاد (ساخته شده به دستور کوروش کبیر) نخستین نمونه شناخته شده از الگوی «چهارباغ» است. هندسه این باغ بر اساس تقسیم آب و کرت‌بندی‌های منظم شکل گرفته که نمادی از چهار عنصر حیات است."
    },
    {
        title: "معماری کوشک",
        text: "کوشک‌ها معمولاً در تقاطع محورهای اصلی باغ قرار می‌گیرند تا بیشترین دید منظر را داشته باشند. در باغ فین کاشان، کوشک صفوی در مرکز قرار دارد اما کوشک قاجاری در انتهای محور اصلی بنا شده است."
    },
    {
        title: "سیستم آبیاری هوشمند",
        text: "ایرانیان باستان با ابداع قنات و استفاده از تنبوشه‌های سفالی، آب را از کیلومترها دورتر بدون تبخیر به دل کویر می‌رساندند. صدای آب در باغ ایرانی نه تنها برای خنکی، بلکه برای آرامش صوتی (Soundscape) طراحی شده است."
    },
    {
        title: "درختان مقدس",
        text: "در باغ ایرانی، سرو نماد جاودانگی و ایستادگی (به دلیل خزان نکردن) و چنار نماد سایه‌گستری و شکوه است. کاشت متناوب این دو درخت در خیابان‌های چهارباغ اصفهان الگویی کلاسیک ایجاد کرده بود."
    },
    {
        title: "باغ تخت شیراز",
        text: "باغ تخت یا «باغ قراچه» نمونه‌ای منحصر به فرد از باغ‌های مطبق (تراس‌بندی شده) در شمال شیراز بود که با الهام از معماری زیگورات‌ها ساخته شد و متاسفانه امروزه تنها ویرانه‌هایی از آن باقی مانده است."
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
        setStatusMessage(`یافت شد: ${p.length + a.length + t.length} سند`);
    } catch { setStatusMessage('خطا در اتصال'); } 
    finally { setIsSearching(false); }
  };

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); executeSearch(filters.query, filters.period, filters.topic); };
  const handleMapSearch = (q: string) => { setFilters(prev => ({...prev, query: q})); setCurrentView(View.SEARCH); executeSearch(q, filters.period, filters.topic); };
  
  // --- INTELLIGENT HARVESTING SYSTEM ---
  const handleQuickAdd = async (p: Partial<Paper>) => {
      setStatusMessage('در حال استخراج اطلاعات...');
      const newId = p.id || crypto.randomUUID();
      
      // Default structure
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
          // Ensure URL is preserved
          url: p.url
      };

      // 1. Attempt to Harvest PDF if URL exists
      if (p.url) {
          try {
              setStatusMessage('تلاش برای دانلود خودکار سند...');
              
              // Use CORS Proxy to bypass restrictions
              const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(p.url);
              
              // Head request or GET to check content type
              const response = await fetch(proxyUrl);
              const contentType = response.headers.get('content-type');
              
              // If it looks like a PDF
              if (response.ok && (contentType?.includes('application/pdf') || p.url.endsWith('.pdf'))) {
                  const blob = await response.blob();
                  const file = new File([blob], `${newPaper.title}.pdf`, { type: 'application/pdf' });
                  
                  // Save to Local DB
                  await saveFile(newId, file);
                  
                  // Index Full Text
                  setStatusMessage('نمایه‌سازی متن...');
                  await processAndIndexPaper(newId, newPaper.title, newPaper.authors, file);
                  
                  newPaper.isLocal = true;
                  setStatusMessage('سند دانلود و ذخیره شد');
              } else {
                  setStatusMessage('فایل PDF مستقیم یافت نشد. لینک ذخیره شد.');
              }
          } catch (e) {
              console.warn("Harvesting failed:", e);
              setStatusMessage('دانلود ناموفق بود. لینک منبع ذخیره شد.');
          }
      } else {
          setStatusMessage('ذخیره متادیتا (بدون لینک دانلود)...');
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
    <div className="flex h-[100dvh] font-sans relative">
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
        
        {/* Top Header - Glass Strip */}
        {/* HIDE HEADER IF IN READER VIEW TO AVOID DOUBLE HEADER OVERLAP */}
        {currentView !== View.READER && (
            <div className="h-16 flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-text-primary text-xl">☰</button>
                    <h2 className="text-xl font-nastaliq text-gold-primary drop-shadow-md pt-2">
                        {currentView === View.SEARCH && 'کاوشگر منابع'}
                        {currentView === View.ATLAS && 'اطلس مکانی'}
                        {currentView === View.LIBRARY && 'آرشیو دیجیتال'}
                        {currentView === View.TIMELINE && 'خط زمان'}
                        {currentView === View.SETTINGS && 'تنظیمات سیستم'}
                    </h2>
                </div>
                <div className="flex items-center gap-3 glass-panel px-4 py-1.5 rounded-full border border-white/5">
                    <span className={`w-2 h-2 rounded-full ${isSearching ? 'bg-gold-primary animate-pulse' : 'bg-teal-glow'}`}></span>
                    <span className="text-xs text-text-muted font-medium">{statusMessage}</span>
                </div>
            </div>
        )}

        {/* Content Area - If Reader, takes full height */}
        <div className={`flex-1 overflow-hidden relative ${currentView !== View.READER ? 'p-4 md:p-6' : 'p-0'}`}>
            
            {/* VIEW: SEARCH (The Aggregator) */}
            {currentView === View.SEARCH && (
                <div className="h-full flex flex-col gap-6 max-w-7xl mx-auto">
                    {/* Search Bar Container */}
                    <div className="glass-panel p-6 shrink-0 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-glow opacity-5 rounded-full blur-2xl"></div>
                        <form onSubmit={handleSearchSubmit} className="relative z-10 flex flex-col gap-4">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={filters.query}
                                    onChange={e => setFilters({...filters, query: e.target.value})}
                                    placeholder="جستجوی موضوعی (مثال: باغ فین، معماری دوره صفوی...)"
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-text-primary placeholder-gray-600 focus:border-teal-glow/50 focus:ring-0 transition-colors text-lg"
                                />
                                <button type="submit" disabled={isSearching} className="absolute left-3 top-3 bottom-3 px-6 bg-teal-glow/10 hover:bg-teal-glow/20 text-teal-glow rounded-lg border border-teal-glow/30 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSearching ? '...' : 'کاوش'}
                                </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-3">
                                {Object.values(HistoricalPeriod).map(p => (
                                    <button 
                                        key={p} 
                                        type="button"
                                        onClick={() => setFilters({...filters, period: p})}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filters.period === p ? 'bg-gold-primary/20 border-gold-primary text-gold-primary' : 'border-white/5 text-gray-500 hover:border-white/20'}`}
                                    >
                                        {PERIOD_LABELS[p]}
                                    </button>
                                ))}
                            </div>
                        </form>
                    </div>

                    {/* LOADING STATE - INTELLIGENT OVERLAY */}
                    {isSearching ? (
                        <div className="flex-1 flex flex-col items-center justify-center relative glass-panel overflow-hidden">
                            {/* Animated Background Radar */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                                <div className="w-[600px] h-[600px] border border-teal-glow rounded-full animate-[spin_10s_linear_infinite]"></div>
                                <div className="absolute w-[400px] h-[400px] border border-gold-primary rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                                <div className="absolute w-[200px] h-[200px] border border-white/20 rounded-full animate-pulse"></div>
                            </div>

                            <div className="z-10 text-center max-w-2xl px-6">
                                <div className="mb-8 flex justify-center">
                                    <div className="w-16 h-16 relative">
                                        <div className="absolute inset-0 border-4 border-t-teal-glow border-r-transparent border-b-gold-primary border-l-transparent rounded-full animate-spin"></div>
                                        <div className="absolute inset-2 border-2 border-white/20 rounded-full"></div>
                                    </div>
                                </div>
                                
                                <h3 className="text-gold-primary font-nastaliq text-2xl mb-4 animate-fade-in-up">
                                    {LOADING_FACTS[currentFactIndex].title}
                                </h3>
                                
                                <p className="text-gray-300 text-lg leading-loose font-serif animate-fade-in">
                                    «{LOADING_FACTS[currentFactIndex].text}»
                                </p>

                                <div className="mt-8 flex flex-col items-center gap-2">
                                    <div className="h-1 w-64 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-teal-glow to-gold-primary w-1/3 animate-[translateX_3s_ease-in-out_infinite_alternate] relative left-0"></div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                                        Processing Knowledge Graph...
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                    /* Results Grid */
                    <div className="flex-1 overflow-y-auto pb-10">
                         {/* Tabs */}
                         <div className="flex gap-6 mb-4 border-b border-white/5 pb-2 px-2">
                             <button onClick={() => setSearchTab('papers')} className={`pb-2 text-sm transition-colors ${searchTab === 'papers' ? 'text-white border-b-2 border-teal-glow' : 'text-gray-500'}`}>
                                 منابع متنی ({paperResults.length})
                             </button>
                             <button onClick={() => setSearchTab('art')} className={`pb-2 text-sm transition-colors ${searchTab === 'art' ? 'text-white border-b-2 border-gold-primary' : 'text-gray-500'}`}>
                                 تصاویر و نگارگری ({artResults.length})
                             </button>
                         </div>

                         {/* Cards */}
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {searchTab === 'papers' && paperResults.map((p, i) => (
                                 <div key={i} className="glass-panel p-4 hover:border-teal-glow/30 transition-all group relative overflow-hidden flex flex-col">
                                     <div className="flex justify-between items-start mb-2">
                                         <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
                                             {SOURCE_LABELS[p.apiSource || ''] || 'Web'}
                                         </span>
                                         <span className="text-[10px] text-gray-500 font-mono">{p.year}</span>
                                     </div>
                                     <h3 className="font-bold text-text-primary text-sm mb-2 leading-relaxed group-hover:text-teal-glow transition-colors">{p.title}</h3>
                                     <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-1">{p.abstract}</p>
                                     <div className="flex justify-between items-center mt-auto border-t border-white/5 pt-3">
                                         <span className="text-[10px] text-gray-600 truncate max-w-[150px]">{p.authors?.join('، ')}</span>
                                         <div className="flex items-center gap-2">
                                             {p.url && (
                                                <button onClick={() => openExternalLink(p.url!)} title="مشاهده آنلاین" className="text-gray-500 hover:text-white transition-colors">
                                                    <span className="text-xs">🔗</span>
                                                </button>
                                             )}
                                             <button onClick={() => handleQuickAdd(p)} className="text-teal-glow hover:text-white bg-teal-glow/10 p-1.5 rounded-lg hover:bg-teal-glow/30 transition-colors" title="افزودن به کتابخانه">
                                                 <span className="text-lg">+</span>
                                             </button>
                                         </div>
                                     </div>
                                 </div>
                             ))}

                            {searchTab === 'art' && artResults.map((a) => (
                                 <div key={a.id} className="glass-panel p-0 overflow-hidden group">
                                     <div className="relative h-48">
                                         <img src={a.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                         <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                                         <button onClick={() => handleQuickAddArt(a)} className="absolute bottom-2 left-2 bg-gold-primary text-black w-8 h-8 rounded-full flex items-center justify-center shadow-glow-gold hover:scale-110 transition-transform">
                                             +
                                         </button>
                                     </div>
                                     <div className="p-3">
                                         <h3 className="text-xs font-bold text-white mb-1 truncate">{a.title}</h3>
                                         <p className="text-[10px] text-gold-primary">{a.period}</p>
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
                <div className="h-full flex flex-col gap-6">
                    <div className="glass-panel p-4 flex justify-between items-center shrink-0">
                        <input 
                            type="text" 
                            value={librarySearchQuery}
                            onChange={e => setLibrarySearchQuery(e.target.value)}
                            placeholder="جستجو در آرشیو شخصی..."
                            className="bg-transparent border-none text-white focus:ring-0 w-full placeholder-gray-600"
                        />
                        <button onClick={() => {setPaperToEdit(null); setIsDbModalOpen(true);}} className="bg-gold-primary/20 text-gold-primary px-4 py-2 rounded-lg text-xs font-bold border border-gold-primary/50 hover:bg-gold-primary hover:text-black transition-colors shrink-0">
                            + ثبت سند
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-4 gap-4 pb-10">
                        {displayedLibrary.map(p => (
                            <div key={p.id} onClick={() => {setCurrentPaper(p); setCurrentView(View.READER);}} className="glass-panel p-0 cursor-pointer group hover:border-gold-primary/30 transition-all flex flex-col">
                                <div className="h-32 bg-black/40 relative overflow-hidden border-b border-white/5">
                                    {p.thumbnailUrl ? (
                                        <img src={p.thumbnailUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl text-white/5 group-hover:text-gold-primary/20 transition-colors">📄</div>
                                    )}
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded border ${p.isLocal ? 'border-teal-glow text-teal-glow' : 'border-gray-600 text-gray-500'}`}>
                                            {p.isLocal ? 'فایل' : 'متادیتا'}
                                        </span>
                                        {!p.isLocal && p.url && (
                                            <span className="text-[8px] px-1.5 py-0.5 rounded border border-blue-500 text-blue-400 bg-blue-500/10">لینک</span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <h3 className="text-xs font-bold text-text-primary mb-1 line-clamp-2">{p.title}</h3>
                                    <div className="mt-auto flex justify-between items-center text-[9px] text-gray-500 pt-2 border-t border-white/5">
                                        <span>{p.year}</span>
                                        <div className="flex gap-2">
                                             {p.url && (
                                                <button onClick={(e) => { e.stopPropagation(); openExternalLink(p.url!); }} className="hover:text-teal-glow" title="لینک خارجی">↗</button>
                                             )}
                                             <button onClick={(e) => handleDeletePaper(p.id, e)} className="hover:text-red-400">حذف</button>
                                        </div>
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
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold-primary/30 to-transparent"></div>
                    
                    {Object.values(HistoricalPeriod).map((period, index) => {
                         const papers = library.filter(p => p.period === period);
                         if (papers.length === 0) return null;
                         return (
                             <div key={period} className={`flex items-center gap-8 mb-12 ${index % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                                 <div className={`w-1/2 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                                     <div className="glass-panel p-4 inline-block max-w-sm hover:border-gold-primary/50 transition-colors group">
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
                                 <div className="relative z-10 flex flex-col items-center justify-center">
                                     <div className="w-4 h-4 bg-black border-2 border-gold-primary rounded-full shadow-glow-gold"></div>
                                 </div>
                                 <div className="w-1/2"></div>
                             </div>
                         )
                    })}
                </div>
            )}

            {/* VIEW: SETTINGS (Restored & Styled) */}
            {currentView === View.SETTINGS && (
                <div className="h-full overflow-y-auto max-w-4xl mx-auto space-y-8">
                    <div className="glass-panel p-8">
                        <h2 className="text-2xl font-nastaliq text-gold-primary mb-6 border-b border-white/10 pb-4">تنظیمات سیستم</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-text-primary">پشتیبان‌گیری داده‌ها</h3>
                                <p className="text-xs text-gray-500">تهیه نسخه پشتیبان از تمام متادیتاهای کتابخانه.</p>
                                <div className="flex gap-3">
                                    <button onClick={handleExport} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg text-xs transition-colors">
                                        دریافت فایل پشتیبان (Export)
                                    </button>
                                    <label className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg text-xs transition-colors text-center cursor-pointer">
                                        بازیابی (Import)
                                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-text-primary">نمایش</h3>
                                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                                    <span className="text-xs text-gray-400">حالت منو</span>
                                    <button onClick={toggleSidebarMode} className="text-teal-glow text-xs hover:underline">
                                        {settings.sidebarMode === 'expanded' ? 'گسترده' : 'فشرده'}
                                    </button>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                                    <span className="text-xs text-gray-400">چیدمان پیش‌فرض</span>
                                    <button onClick={() => setLibraryView(settings.libraryView === 'grid' ? 'list' : 'grid')} className="text-teal-glow text-xs hover:underline">
                                        {settings.libraryView === 'grid' ? 'شبکه‌ای' : 'لیستی'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10 text-center">
                            <button 
                                onClick={() => { if(confirm("تمام اطلاعات حذف شود؟")) { indexedDB.deleteDatabase('PardisScholarDB'); window.location.reload(); } }}
                                className="text-red-500/60 hover:text-red-500 text-xs transition-colors"
                            >
                                حذف کامل پایگاه داده و شروع مجدد
                            </button>
                        </div>
                    </div>

                    {/* NEW CREDITS SECTION */}
                    <div className="glass-panel p-8 text-center relative overflow-hidden border border-gold-primary/20">
                         <div className="absolute inset-0 bg-gold-primary/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
                         
                         <h3 className="text-gold-primary font-nastaliq text-xl mb-6">تیم پژوهش و توسعه سامانه</h3>
                         
                         <div className="space-y-4 font-sans">
                             <div className="flex flex-col items-center">
                                 <span className="text-xs text-gray-500 mb-1">توسعه دهنده نرم‌افزار</span>
                                 <span className="text-lg text-white font-bold">کیان منصوری جمشیدی</span>
                             </div>

                             <div className="flex flex-col items-center">
                                 <span className="text-xs text-gray-500 mb-1">استاد راهنما</span>
                                 <span className="text-base text-teal-glow font-bold">دکتر جیحانی</span>
                             </div>

                             <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto my-4"></div>

                             <div className="grid grid-cols-3 gap-4 text-xs text-gray-400">
                                 <div>
                                     <span className="block text-gold-primary/60 mb-1">درس</span>
                                     باغ ایرانی
                                 </div>
                                 <div>
                                     <span className="block text-gold-primary/60 mb-1">دانشگاه</span>
                                     شهید بهشتی
                                 </div>
                                 <div>
                                     <span className="block text-gold-primary/60 mb-1">سال تحصیلی</span>
                                     ۱۴۰۴ - ۲۰۲۵
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            )}

            {/* Modals & Overlays */}
            {currentView === View.READER && <PDFReader paper={currentPaper} onUpdateNote={() => {}} onClose={() => setCurrentView(View.LIBRARY)} />}
            <DatabaseModal isOpen={isDbModalOpen} onClose={() => setIsDbModalOpen(false)} onSave={handleSaveDbRecord} initialData={paperToEdit} />
            <CitationModal paper={citationPaper} onClose={() => setCitationPaper(null)} />
        </div>
      </main>
    </div>
  );
};

export default App;
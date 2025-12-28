import React, { useState, useEffect, useRef } from 'react';
import { Paper, Note } from '../types';
import { getPdfData, openExternalLink } from '../services/storageService';
import CitationModal from './CitationModal';
import * as pdfjsLib from 'pdfjs-dist';

// --- CRITICAL PDF RENDER FIXES ---

if (typeof (Promise as any).withResolvers === 'undefined') {
  if (typeof window !== 'undefined') {
    // @ts-ignore
    (window.Promise as any).withResolvers = function () {
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
}

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const CORS_PROXY = 'https://corsproxy.io/?';

interface PDFReaderProps {
  paper: Paper | null;
  onUpdateNote: (paperId: string, note: Note) => void;
  onClose: () => void;
  onToggleSidebar?: () => void;
}

const PDFReader: React.FC<PDFReaderProps> = ({ paper, onUpdateNote, onClose, onToggleSidebar }) => {
  const [newNote, setNewNote] = useState('');
  
  // PDF State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCitation, setShowCitation] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showNotesMobile, setShowNotesMobile] = useState(false);

  // 1. Load the PDF Document
  useEffect(() => {
    if (!paper) return;

    if (paper.docType === 'artwork' || paper.docType === 'travelogue') {
        setScale(1.0);
        return;
    }

    // Smart Mobile Scale
    if (window.innerWidth < 768) {
        // Calculate slightly less than width to add padding
        const containerWidth = window.innerWidth - 32; 
        // We guess a standard A4 ratio roughly, but we can tune this after page load if needed.
        // For now, start small.
        setScale(0.6); 
    } else {
        setScale(1.2);
    }

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);
      setPageNum(1);
      setPdfDoc(null);

      try {
        const baseParams = {
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
            enableXfa: true,
        };

        let loadingTask;

        if (paper.isLocal) {
          const pdfData = await getPdfData(paper.id);
          if (pdfData) {
            loadingTask = pdfjsLib.getDocument({ ...baseParams, data: pdfData });
          } else {
            throw new Error("Local file data not found in database.");
          }
        } else {
           const url = paper.url;
           if (!url) {
             setIsLoading(false);
             return;
           }
           loadingTask = pdfjsLib.getDocument({ ...baseParams, url: url });
        }

        try {
            const doc = await loadingTask.promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setIsLoading(false);
        } catch (loadError: any) {
             console.warn("Primary load failed.", loadError);
             if (!paper.isLocal && paper.url) {
                try {
                    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(paper.url)}`;
                    const proxyTask = pdfjsLib.getDocument({ ...baseParams, url: proxyUrl });
                    const doc = await proxyTask.promise;
                    setPdfDoc(doc);
                    setNumPages(doc.numPages);
                    setIsLoading(false);
                } catch (proxyError) {
                    throw new Error("Unable to load remote PDF via proxy.");
                }
             } else {
                 throw loadError;
             }
        }

      } catch (err: any) {
        console.error("PDF Load Error:", err);
        setError("امکان نمایش مستقیم این سند وجود ندارد.");
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [paper]);

  // 2. Render PDF Page on Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || paper?.docType === 'artwork' || paper?.docType === 'travelogue') return;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        
        // Auto-fit to mobile width on first render if specific flag set?
        // For now rely on scale state.
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d', { alpha: false }); 
        
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error("Render error:", err);
        }
      }
    };

    renderPage();
  }, [pdfDoc, pageNum, scale]);

  if (!paper) return null;

  const changePage = (offset: number) => {
    setPageNum(prev => Math.min(Math.max(1, prev + offset), numPages));
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note: Note = {
      id: crypto.randomUUID(),
      content: newNote,
      createdAt: Date.now(),
      page: (paper.docType === 'artwork' || paper.docType === 'travelogue') ? 1 : pageNum 
    };
    onUpdateNote(paper.id, note);
    setNewNote('');
  };

  const isArtwork = paper.docType === 'artwork';
  const isTravelogue = paper.docType === 'travelogue';

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#0B0F12] relative font-sans overflow-hidden" dir="rtl">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative order-1 md:order-2">
        
        {/* Top Toolbar - IMPROVED FOR MOBILE */}
        <div className="h-14 bg-black/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-3 md:px-4 shadow-lg z-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-3 overflow-hidden">
             <button onClick={onClose} className="text-gray-200 hover:text-white flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-lg bg-white/5 active:bg-white/10 transition">
                <span className="text-lg">➜</span> <span className="text-xs font-bold">بازگشت</span>
             </button>
             
            <h2 
                className="font-bold text-gold-primary truncate text-xs md:text-sm font-sans flex-1"
                title={paper.title}
            >
              {paper.title}
            </h2>
          </div>
          
          {/* Viewer Controls */}
          {(pdfDoc || isArtwork) && (
             <div className="flex items-center space-x-2 space-x-reverse" dir="ltr">
                {/* Scale Controls - Hidden on tiny screens, simplified */}
                <div className="hidden sm:flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5">
                    <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="px-2 text-gray-400 hover:text-white rounded text-lg">-</button>
                    <span className="text-xs font-mono w-8 text-center text-teal-glow">{Math.round(scale * 100)}</span>
                    <button onClick={() => setScale(s => Math.min(isArtwork ? 5 : 3, s + 0.1))} className="px-2 text-gray-400 hover:text-white rounded text-lg">+</button>
                </div>
                
                {/* Mobile Pagination */}
                {!isArtwork && (
                    <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5">
                        <button onClick={() => changePage(1)} disabled={pageNum >= numPages} className="px-2 py-1 text-gray-300 hover:text-white disabled:opacity-30">‹</button>
                        <span className="text-xs font-mono w-10 text-center text-teal-glow">{pageNum}/{numPages}</span>
                        <button onClick={() => changePage(-1)} disabled={pageNum <= 1} className="px-2 py-1 text-gray-300 hover:text-white disabled:opacity-30">›</button>
                    </div>
                )}
             </div>
          )}
        </div>

        {/* Content Viewer */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-[#0a0c10] p-2 md:p-8 flex justify-center relative touch-pan-x touch-pan-y bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]" dir="ltr">
            
            {/* 1. Artwork Viewer */}
            {isArtwork && paper.thumbnailUrl && (
                <div className="relative shadow-2xl bg-[#0a0c10] border border-white/10 flex items-center justify-center h-full w-full">
                    <img src={paper.thumbnailUrl} className="max-w-full max-h-full object-contain" />
                </div>
            )}

            {/* 2. Travelogue Viewer (New) */}
            {isTravelogue && (
                <div className="w-full max-w-2xl bg-[#1a1612] border border-[#3d3228] shadow-2xl p-8 md:p-12 relative my-auto">
                    {/* Decorative Corner accents */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-gold-primary/30"></div>
                    <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-gold-primary/30"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-gold-primary/30"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-gold-primary/30"></div>

                    <div className="text-center mb-8 border-b border-white/5 pb-4">
                        <h2 className="font-serif text-2xl text-gold-primary mb-2 ltr">{paper.title}</h2>
                        <div className="text-sm text-gray-400 font-serif ltr italic">by {paper.authors.join(', ')} ({paper.year})</div>
                    </div>

                    <div className="font-serif text-gray-300 text-lg leading-loose ltr whitespace-pre-wrap">
                        {paper.abstract}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                         {paper.url && (
                            <button onClick={() => openExternalLink(paper.url!)} className="text-blue-300 bg-blue-500/10 px-6 py-2 rounded-lg hover:bg-blue-500 hover:text-white transition-colors inline-flex items-center gap-2 text-sm">
                                <span>Read Full Book at Source</span>
                                <span>↗</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 3. Loader */}
            {isLoading && !isArtwork && !isTravelogue && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-20 backdrop-blur-sm" dir="rtl">
                    <div className="w-12 h-12 border-4 border-white/10 border-t-teal-glow rounded-full animate-spin mb-4"></div>
                    <span className="text-teal-glow text-xs font-medium">در حال پردازش سند...</span>
                </div>
            )}

            {/* 4. Fallback */}
            {!isArtwork && !isTravelogue && !pdfDoc && !isLoading && (
                <div className="max-w-xl w-full glass-panel p-6 text-center mt-10" dir="rtl">
                    <h3 className="text-gold-primary font-bold text-lg mb-2">PDF موجود نیست</h3>
                    <p className="text-gray-400 text-sm mb-4 leading-relaxed">{error || "فایل دیجیتال برای این سند یافت نشد."}</p>
                    {paper.url && (
                        <button onClick={() => openExternalLink(paper.url!)} className="text-teal-glow border border-teal-glow/50 px-6 py-2 rounded-lg hover:bg-teal-glow/10 text-xs font-bold w-full sm:w-auto">
                            مشاهده در منبع اصلی ↗
                        </button>
                    )}
                </div>
            )}
            
            {/* 5. PDF Canvas */}
            {!isArtwork && !isTravelogue && pdfDoc && (
                <div className="shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/5 my-auto">
                     <canvas ref={canvasRef} className="bg-white block max-w-full h-auto" />
                </div>
            )}
        </div>

        {/* Mobile Notes Toggle FAB */}
        <button 
            onClick={() => setShowNotesMobile(!showNotesMobile)}
            className="md:hidden absolute bottom-6 left-6 w-12 h-12 bg-gold-primary text-black rounded-full shadow-lg flex items-center justify-center z-30 hover:scale-110 transition-transform active:scale-95"
        >
            <span className="text-xl">✎</span>
        </button>
      </div>

      {/* Side Panel: Annotations */}
      <div className={`
        fixed md:relative inset-y-0 right-0 z-40 md:z-auto
        w-80 bg-[#0F1318] border-l border-white/5 flex flex-col shadow-2xl md:shadow-none
        transform transition-transform duration-300 ease-in-out shrink-0 order-2 md:order-1
        ${showNotesMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center h-14">
            <h3 className="font-bold text-teal-glow text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-teal-glow rounded-full"></span>
                یادداشت‌های پژوهشی
            </h3>
            <button onClick={() => setShowNotesMobile(false)} className="md:hidden text-gray-500 hover:text-white p-2 text-xl">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {paper.notes.length === 0 && (
                <div className="text-center text-gray-600 text-xs mt-10 italic">
                    یادداشتی ثبت نشده است.
                </div>
            )}
            {paper.notes.map(note => (
                <div key={note.id} className="bg-white/5 p-3 rounded-xl border border-white/5 hover:border-gold-primary/30 text-xs text-gray-300 relative group">
                    <p className="whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-gray-500 flex justify-between items-center font-mono">
                        <span>{new Date(note.createdAt).toLocaleDateString('fa-IR')}</span>
                        {(!isArtwork && !isTravelogue) && note.page && (
                            <button 
                                onClick={() => { setPageNum(note.page!); setShowNotesMobile(false); }}
                                className="text-gold-primary hover:underline"
                            >
                                ص {note.page}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 border-t border-white/5 bg-black/40 pb-safe">
            <textarea
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs focus:border-teal-glow/50 focus:ring-0 resize-none placeholder-gray-600 transition-colors"
                rows={3}
                placeholder="یادداشت..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
            />
            <button 
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="mt-3 w-full bg-teal-glow/10 text-teal-glow py-3 rounded-lg text-xs font-bold hover:bg-teal-glow hover:text-black transition disabled:opacity-50"
            >
                ثبت یادداشت
            </button>
        </div>
      </div>
      
      {showNotesMobile && <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setShowNotesMobile(false)} />}
      
      <CitationModal paper={showCitation ? paper : null} onClose={() => setShowCitation(false)} />
    </div>
  );
};

export default PDFReader;
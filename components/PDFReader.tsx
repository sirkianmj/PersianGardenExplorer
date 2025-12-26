import React, { useState, useEffect, useRef } from 'react';
import { Paper, Note } from '../types';
import { getPdfData, openExternalLink } from '../services/storageService';
import CitationModal from './CitationModal';
import * as pdfjsLib from 'pdfjs-dist';

// --- CRITICAL PDF RENDER FIXES ---

// 1. Polyfill for Promise.withResolvers (Required for PDF.js v4+)
// This prevents the "white screen" or "broken words" crash on modern PDF.js versions.
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

// 2. Set Worker Source to Exact Version (Prevents version mismatch errors)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const CORS_PROXY = 'https://corsproxy.io/?';

interface PDFReaderProps {
  paper: Paper | null;
  onUpdateNote: (paperId: string, note: Note) => void;
  onClose: () => void;
}

const PDFReader: React.FC<PDFReaderProps> = ({ paper, onUpdateNote, onClose }) => {
  const [newNote, setNewNote] = useState('');
  
  // PDF State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCitation, setShowCitation] = useState(false); // Restored Citation State

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showNotesMobile, setShowNotesMobile] = useState(false);

  // 1. Load the PDF Document
  useEffect(() => {
    if (!paper) return;

    if (paper.docType === 'artwork') {
        setScale(1.0);
        return;
    }

    if (window.innerWidth < 768) {
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
        // 3. Configuration for Correct Font Rendering
        const baseParams = {
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
            // CRITICAL: standardFontDataUrl fixes the "random characters" or dots issue for non-embedded fonts
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
    if (!pdfDoc || !canvasRef.current || paper?.docType === 'artwork') return;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d', { alpha: false }); // Optimization
        
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        // Ensure white background for PDF content
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
      page: paper.docType === 'artwork' ? 1 : pageNum 
    };
    onUpdateNote(paper.id, note);
    setNewNote('');
  };

  const isArtwork = paper.docType === 'artwork';

  return (
    // Converted to Dark Mode colors but kept the EXACT flex structure you liked
    <div className="flex flex-col md:flex-row h-full bg-[#0B0F12] relative font-sans overflow-hidden" dir="rtl">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative order-1 md:order-2">
        
        {/* Top Toolbar */}
        <div className="h-14 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-2 md:px-4 shadow-lg z-10 shrink-0">
          <div className="flex items-center space-x-2 space-x-reverse min-w-max">
             <button onClick={onClose} className="text-gray-300 hover:text-white font-medium flex items-center gap-2 px-2 py-1 border border-white/10 rounded-lg bg-white/5 transition">
               <span className="text-sm">→</span> <span className="text-xs hidden sm:inline">بازگشت</span>
            </button>
            <div className="h-5 w-px bg-white/10 mx-2"></div>
            <h2 
                className="font-bold text-gold-primary truncate max-w-[150px] md:max-w-md text-xs md:text-sm font-sans"
                title={paper.title}
            >
              {paper.title}
            </h2>
          </div>
          
          {/* Viewer Controls */}
          {(pdfDoc || isArtwork) && (
             <div className="flex items-center space-x-2 space-x-reverse min-w-max" dir="ltr">
                <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5">
                    <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="px-2 text-gray-400 hover:text-white rounded text-lg">-</button>
                    <span className="text-xs font-mono w-10 text-center text-teal-glow">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(isArtwork ? 5 : 3, s + 0.1))} className="px-2 text-gray-400 hover:text-white rounded text-lg">+</button>
                </div>
                
                {/* Pagination */}
                {!isArtwork && (
                    <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5">
                        <button onClick={() => changePage(1)} disabled={pageNum >= numPages} className="px-2 text-gray-400 hover:text-white disabled:opacity-30">◀</button>
                        <span className="text-xs font-mono w-14 text-center text-teal-glow">{pageNum} / {numPages}</span>
                        <button onClick={() => changePage(-1)} disabled={pageNum <= 1} className="px-2 text-gray-400 hover:text-white disabled:opacity-30">▶</button>
                    </div>
                )}
                
                {/* Cite Button - RESTORED */}
                <button 
                    onClick={() => setShowCitation(true)} 
                    className="ml-2 bg-gold-primary text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-white transition flex items-center gap-1 shadow-glow-gold"
                >
                    <span className="text-sm">❝</span>
                    <span className="hidden sm:inline">استناد</span>
                </button>
             </div>
          )}
        </div>

        {/* Content Viewer */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-[#0a0c10] p-4 md:p-8 flex justify-center relative touch-pan-x touch-pan-y bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]" dir="ltr">
            
            {/* 1. Artwork Viewer */}
            {isArtwork && paper.thumbnailUrl && (
                <div className="relative shadow-2xl bg-[#0a0c10] border border-white/10 flex items-center justify-center" style={{ transform: `scale(${scale})`, transition: 'transform 0.2s' }}>
                    <img src={paper.thumbnailUrl} className="max-w-full h-auto object-contain" />
                </div>
            )}

            {/* 2. Loader */}
            {isLoading && !isArtwork && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-20 backdrop-blur-sm" dir="rtl">
                    <div className="w-12 h-12 border-4 border-white/10 border-t-teal-glow rounded-full animate-spin mb-4"></div>
                    <span className="text-teal-glow text-xs font-medium">در حال بارگذاری...</span>
                </div>
            )}

            {/* 3. Fallback */}
            {!isArtwork && !pdfDoc && !isLoading && (
                <div className="max-w-xl w-full glass-panel p-8 text-center" dir="rtl">
                    <h3 className="text-gold-primary font-bold text-lg mb-2">PDF در دسترس نیست</h3>
                    <p className="text-gray-400 text-sm mb-4">{error || "فایل بارگذاری نشد"}</p>
                    {paper.url && (
                        <button onClick={() => openExternalLink(paper.url!)} className="text-teal-glow border border-teal-glow/50 px-4 py-2 rounded hover:bg-teal-glow/10 text-xs">
                            مشاهده آنلاین ↗
                        </button>
                    )}
                </div>
            )}
            
            {/* 4. PDF Canvas */}
            {!isArtwork && pdfDoc && (
                <div className="shadow-[0_0_60px_rgba(0,0,0,0.8)] border border-white/10">
                     <canvas ref={canvasRef} className="bg-white block max-w-full" />
                </div>
            )}
        </div>

        {/* Mobile Notes Toggle FAB */}
        <button 
            onClick={() => setShowNotesMobile(!showNotesMobile)}
            className="md:hidden absolute bottom-6 left-6 w-12 h-12 bg-gold-primary text-black rounded-full shadow-lg flex items-center justify-center z-30 hover:scale-110 transition-transform"
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
            <button onClick={() => setShowNotesMobile(false)} className="md:hidden text-gray-500 hover:text-white">✕</button>
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
                        {!isArtwork && note.page && (
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

        <div className="p-4 border-t border-white/5 bg-black/40">
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
                className="mt-3 w-full bg-teal-glow/10 text-teal-glow py-2 rounded-lg text-xs font-bold hover:bg-teal-glow hover:text-black transition disabled:opacity-50"
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
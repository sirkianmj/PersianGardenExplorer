

import React, { useState, useEffect, useRef } from 'react';
import { Paper, Note } from '../types';
import { getPdfData, openExternalLink } from '../services/storageService';
import * as pdfjsLib from 'pdfjs-dist';

// CRITICAL FIX: Load worker via CDN matching package.json version (4.0.379)
// This avoids complex bundling issues and "Invalid URL" errors with 'import.meta.url'
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showNotesMobile, setShowNotesMobile] = useState(false);

  // 1. Load the PDF Document (Only if it's NOT an artwork)
  useEffect(() => {
    if (!paper) return;

    // Handle Artworks differently
    if (paper.docType === 'artwork') {
        setScale(1.0); // Reset scale for image
        return;
    }

    // Adjust initial scale based on window width
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
        // Configuration for PDF.js - No CDN cMap needed if we have text issues we can add it later
        // But bundling cmaps is heavy, so we keep using standard params or CDN for cmaps only if strictly needed.
        // For viewing, usually optional.
        const baseParams = {
             // We can point to a CDN for CMaps if text selection is buggy, but for rendering it's optional
            cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
            cMapPacked: true,
        };

        let loadingTask;

        // Strategy: Use Raw Data for Local Files, URL for Remote
        if (paper.isLocal) {
          console.log(`Attempting to load local file data: ${paper.id}`);
          const pdfData = await getPdfData(paper.id);
          
          if (pdfData) {
            console.log("Local Data retrieved successfully. Size:", pdfData.length);
            loadingTask = pdfjsLib.getDocument({ ...baseParams, data: pdfData });
          } else {
            console.error("Failed to retrieve local data for ID:", paper.id);
            throw new Error("Local file data not found in database.");
          }
        } else {
           // Remote URL Handling
           const url = paper.url;
           if (!url) {
             setIsLoading(false);
             return;
           }
           // Try direct URL first
           loadingTask = pdfjsLib.getDocument({ ...baseParams, url: url });
        }

        // Execute Loading
        try {
            const doc = await loadingTask.promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setIsLoading(false);
        } catch (loadError: any) {
             console.warn("Primary load failed.", loadError);
             
             // Retry with CORS Proxy if it's a REMOTE file
             if (!paper.isLocal && paper.url) {
                try {
                    console.log("Attempting proxy load...");
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
        setError("امکان نمایش مستقیم این سند وجود ندارد (محدودیت دسترسی یا فایل خراب).");
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
        const context = canvas.getContext('2d');
        
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

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

  // Handlers
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
    <div className="flex flex-col md:flex-row h-full bg-gray-100 relative font-persian overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Top Toolbar */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-2 md:px-4 shadow-sm z-10 shrink-0 overflow-x-auto">
          <div className="flex items-center space-x-2 space-x-reverse min-w-max">
             <button onClick={onClose} className="text-gray-500 hover:text-garden-dark font-medium flex items-center gap-1 px-2 py-1">
               <span className="text-xl">→</span> <span className="text-sm hidden sm:inline">بازگشت</span>
            </button>
            <div className="h-6 w-px bg-gray-300 mx-1 md:mx-2"></div>
            <h2 
                className="font-bold text-gray-800 truncate max-w-[150px] md:max-w-md text-sm md:text-base"
                title={paper.title}
            >
              {paper.title}
            </h2>
          </div>
          
          {/* Viewer Controls */}
          {(pdfDoc || isArtwork) && (
             <div className="flex items-center space-x-2 space-x-reverse min-w-max" dir="ltr">
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5 md:p-1">
                    <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="px-2 hover:bg-white rounded text-sm font-bold">-</button>
                    <span className="text-xs font-mono w-8 md:w-12 text-center text-gray-600 hidden sm:inline-block">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(isArtwork ? 5 : 3, s + 0.1))} className="px-2 hover:bg-white rounded text-sm font-bold">+</button>
                </div>
                
                {/* Pagination (Only for PDF) */}
                {!isArtwork && (
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 md:p-1">
                        <button 
                            onClick={() => changePage(1)} 
                            disabled={pageNum >= numPages}
                            className="p-1 md:p-1.5 hover:bg-white rounded disabled:opacity-30 transition"
                        >
                            ◀
                        </button>
                        <span className="text-xs font-mono w-12 md:w-20 text-center text-gray-600">
                            {pageNum} / {numPages}
                        </span>
                        <button 
                            onClick={() => changePage(-1)} 
                            disabled={pageNum <= 1}
                            className="p-1 md:p-1.5 hover:bg-white rounded disabled:opacity-30 transition"
                        >
                            ▶
                        </button>
                    </div>
                )}
             </div>
          )}
        </div>

        {/* Content Viewer */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-gray-200/50 p-4 md:p-8 flex justify-center relative touch-pan-x touch-pan-y" dir="ltr">
            
            {/* 1. Artwork Viewer */}
            {isArtwork && paper.thumbnailUrl && (
                <div 
                    className="relative shadow-2xl bg-white flex items-center justify-center transition-transform duration-200 ease-out origin-top"
                    style={{ transform: `scale(${scale})` }}
                >
                    <img 
                        src={paper.thumbnailUrl} 
                        alt={paper.title} 
                        className="max-w-full h-auto object-contain"
                        style={{ maxHeight: 'none' }} // Allow scaling beyond viewport
                    />
                </div>
            )}

            {/* 2. PDF Loader */}
            {isLoading && !isArtwork && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 z-20 backdrop-blur-sm" dir="rtl">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-garden-dark mb-4"></div>
                    <span className="text-garden-dark font-medium">در حال بارگذاری...</span>
                </div>
            )}

            {/* 3. PDF Fallback / Metadata View */}
            {!isArtwork && !pdfDoc && !isLoading && (
                <div className="max-w-2xl w-full bg-white shadow-lg p-6 md:p-12 min-h-[500px]" dir="rtl">
                     <div className="border-b-2 border-garden-dark pb-6 mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-garden-dark mb-4 leading-normal">{paper.title}</h1>
                        <p className="text-gray-600 italic mb-2 text-sm">{paper.authors.join('، ')} • <span className="font-sans">{paper.year}</span></p>
                    </div>
                    
                    <div className="prose max-w-none">
                        <h3 className="text-lg text-gray-800 mb-2 font-bold">چکیده / توضیحات</h3>
                        <p className="text-gray-700 leading-relaxed text-justify mb-8 text-base">
                            {paper.abstract || "توضیحی در دسترس نیست."}
                        </p>
                    </div>

                    <div className="mt-12 p-6 bg-red-50 border border-red-100 rounded-lg text-center">
                        <p className="text-red-800 font-medium mb-2 text-sm">{error || "فایل PDF پیوست نشده است"}</p>
                        {paper.url && (
                             <button 
                                onClick={() => openExternalLink(paper.url!)}
                                className="inline-block mt-2 bg-garden-dark text-white px-6 py-2 rounded shadow hover:bg-opacity-90 transition text-sm cursor-pointer"
                            >
                                مشاهده منبع اصلی ↗
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            {/* 4. PDF Canvas */}
            {!isArtwork && pdfDoc && (
                <div className="shadow-xl">
                     <canvas ref={canvasRef} className="bg-white block max-w-full" />
                </div>
            )}
        </div>

        {/* Mobile Notes Toggle FAB */}
        <button 
            onClick={() => setShowNotesMobile(!showNotesMobile)}
            className="md:hidden absolute bottom-6 left-6 w-12 h-12 bg-garden-dark text-white rounded-full shadow-lg flex items-center justify-center z-30 hover:scale-105 transition-transform"
            title="یادداشت‌ها"
        >
            <span className="text-xl">✎</span>
        </button>
      </div>

      {/* Side Panel: Annotations */}
      <div className={`
        fixed md:relative inset-y-0 right-0 z-40 md:z-auto
        w-80 bg-white border-r border-gray-200 flex flex-col shadow-xl md:shadow-none
        transform transition-transform duration-300 ease-in-out shrink-0
        ${showNotesMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 text-sm">یادداشت‌های پژوهشی</h3>
            <button 
                onClick={() => setShowNotesMobile(false)}
                className="md:hidden text-gray-500 hover:text-red-500 px-2"
            >
                ✕
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {paper.notes.length === 0 && (
                <div className="text-center text-gray-400 text-sm mt-10 italic">
                    یادداشتی ثبت نشده است.
                </div>
            )}
            {paper.notes.map(note => (
                <div key={note.id} className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-gray-800 relative group shadow-sm">
                    <p className="whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <div className="mt-2 pt-2 border-t border-yellow-200/50 text-[10px] text-gray-500 flex justify-between items-center font-sans">
                        <span>{new Date(note.createdAt).toLocaleDateString('fa-IR')}</span>
                        {!isArtwork && note.page && (
                            <button 
                                onClick={() => {
                                    setPageNum(note.page!);
                                    setShowNotesMobile(false);
                                }}
                                className="text-blue-600 hover:underline font-medium"
                            >
                                صفحه {note.page}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
            <textarea
                className="w-full border border-gray-300 rounded p-3 text-base md:text-sm focus:ring-2 focus:ring-garden-dark focus:border-transparent outline-none resize-none shadow-sm"
                rows={3}
                placeholder="یادداشت خود را بنویسید..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddNote();
                    }
                }}
            />
            <button 
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="mt-3 w-full bg-garden-dark text-white py-2.5 rounded text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition shadow-sm"
            >
                ثبت یادداشت {isArtwork ? '(تصویر)' : (pdfDoc ? `(صفحه ${pageNum})` : '')}
            </button>
        </div>
      </div>
      
      {/* Mobile Overlay for Notes */}
      {showNotesMobile && (
        <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setShowNotesMobile(false)}
        />
      )}
    </div>
  );
};

export default PDFReader;
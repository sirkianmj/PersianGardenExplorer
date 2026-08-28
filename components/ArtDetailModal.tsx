// Developed by Kian Mansouri Jamshidi - Pardis Scholar Art Detail & Zoom Modal
import React, { useState } from 'react';
import { ArtWork } from '../types';

interface ArtDetailModalProps {
  artwork: ArtWork | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToLibrary: (artwork: ArtWork) => void;
  onOpenInReader?: (artwork: ArtWork) => void;
}

const ArtDetailModal: React.FC<ArtDetailModalProps> = ({
  artwork,
  isOpen,
  onClose,
  onAddToLibrary,
  onOpenInReader
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !artwork) return null;

  const isPdf = !!(
    artwork.isPdf || 
    artwork.pdfUrl || 
    artwork.highResUrl?.toLowerCase().endsWith('.pdf') ||
    artwork.medium?.includes('PDF')
  );

  const handleSave = () => {
    onAddToLibrary(artwork);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleDirectDownloadPdf = async () => {
    const targetUrl = artwork.pdfUrl || artwork.highResUrl || artwork.imageUrl;
    if (!targetUrl) return;

    setIsDownloading(true);
    try {
      const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(targetUrl);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${artwork.title.replace(/[\/\\:*?"<>|]/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } else {
        window.open(targetUrl, '_blank');
      }
    } catch {
      window.open(targetUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const displayImg = artwork.imageUrl || artwork.highResUrl;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md transition-all animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] bg-[#0E1318] border border-gold-primary/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row text-right"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center hover:bg-gold-primary hover:text-black hover:border-gold-primary transition-all"
          title="بستن"
        >
          ✕
        </button>

        {/* Image / Document Preview Area */}
        <div className="relative w-full md:w-3/5 bg-[#080B0E] flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-[500px] p-4 group">
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-10 h-10 border-2 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin"></div>
            </div>
          )}
          
          <img 
            src={displayImg} 
            alt={artwork.title}
            referrerPolicy="no-referrer"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              const target = e.currentTarget;
              if (artwork.imageUrl && target.src !== artwork.imageUrl) {
                target.src = artwork.imageUrl;
              } else {
                setImgLoaded(true);
              }
            }}
            className={`max-h-[78vh] w-auto max-w-full object-contain rounded-lg shadow-2xl transition-all duration-300 ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in group-hover:brightness-105'}`}
            onClick={() => setIsZoomed(!isZoomed)}
          />

          {/* Top Badge for PDF */}
          {isPdf && (
            <div className="absolute top-4 right-4 bg-red-500/90 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-sm border border-red-400/40">
              <span>📄</span>
              <span>سند و کتابچه دیجیتال PDF</span>
            </div>
          )}

          {/* Zoom Toggle Pill */}
          <button 
            onClick={() => setIsZoomed(!isZoomed)}
            className="absolute bottom-4 left-4 bg-black/70 hover:bg-black/90 text-gold-primary border border-gold-primary/40 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-sm transition-all"
          >
            <span>{isZoomed ? '🔍 کوچک‌نمایی' : '🔍 بزرگ‌نمایی جزئیات'}</span>
          </button>
        </div>

        {/* Metadata & Curatorial Details */}
        <div className="w-full md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-[92vh] border-t md:border-t-0 md:border-r border-white/10 bg-gradient-to-b from-[#121820] to-[#0E1318]">
          <div className="space-y-4">
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                isPdf 
                  ? 'bg-teal-glow/15 text-teal-glow border-teal-glow/30'
                  : 'bg-gold-primary/15 text-gold-primary border-gold-primary/30'
              }`}>
                {isPdf ? 'نسخه چاپی / سند PDF' : 'نگارگری و معماری منظر'}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {artwork.date || 'تاریخ نامشخص'}
              </span>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white leading-snug">
                {artwork.title}
              </h2>
              {artwork.artist && (
                <p className="text-sm text-gold-primary mt-1 font-medium">
                  {artwork.artist}
                </p>
              )}
            </div>

            {/* Structured Specs Grid */}
            <div className="grid grid-cols-1 gap-2.5 py-2">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-[11px] text-gray-400 block mb-0.5">دوره تاریخی و دسته‌بندی:</span>
                <span className="text-xs text-text-primary font-medium">{artwork.period || 'مکتب نگارگری ایران'}</span>
              </div>

              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-[11px] text-gray-400 block mb-0.5">محل نگهداری / منبع آرشیو:</span>
                <span className="text-xs text-text-primary font-medium">{artwork.department || 'مجموعه هنر اسلامی'}</span>
              </div>

              {artwork.medium && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <span className="text-[11px] text-gray-400 block mb-0.5">تکنیک و قالب اثر:</span>
                  <span className="text-xs text-gray-300">{artwork.medium}</span>
                </div>
              )}
            </div>

            {/* Curatorial Description / Garden context */}
            {artwork.description && (
              <div className="bg-gold-primary/5 rounded-xl p-3.5 border border-gold-primary/20">
                <h4 className="text-xs font-bold text-gold-primary mb-1">توضیحات و تحلیل محتوا:</h4>
                <p className="text-xs text-gray-300 leading-relaxed text-justify">
                  {artwork.description}
                </p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-5 border-t border-white/10 mt-5 flex flex-col gap-2.5">
            {/* If PDF: Reader Open Button & Direct Download */}
            {isPdf && onOpenInReader && (
              <button
                onClick={() => {
                  onClose();
                  onOpenInReader(artwork);
                }}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-teal-glow text-black hover:bg-teal-glow/90 shadow-glow-teal flex items-center justify-center gap-2 transition-all"
              >
                <span>📖 باز کردن و مطالعه کامل در کتابخوان (PDF Reader)</span>
              </button>
            )}

            {isPdf && (
              <button
                onClick={handleDirectDownloadPdf}
                disabled={isDownloading}
                className="w-full py-2.5 px-4 rounded-xl bg-gold-primary/15 hover:bg-gold-primary/25 text-gold-primary border border-gold-primary/40 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>{isDownloading ? '⏳ در حال دریافت فایل...' : '📥 دریافت مستقیم فایل PDF'}</span>
              </button>
            )}

            {/* Save to Digital Library Button */}
            <button
              onClick={handleSave}
              className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
                isSaved 
                  ? 'bg-teal-glow text-black font-bold shadow-glow-teal'
                  : isPdf 
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/15' 
                    : 'bg-gold-primary text-black hover:bg-gold-primary/90 shadow-glow-gold'
              }`}
            >
              <span>{isSaved ? '✓ در کتابخانه پژوهشی ذخیره شد' : '+ افزودن به کتابخانه دیجیتال'}</span>
            </button>

            <div className="flex gap-2">
              {artwork.museumUrl && (
                <a
                  href={artwork.museumUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-center text-xs border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>🏛 منبع سند</span>
                  <span className="text-[10px]">↗</span>
                </a>
              )}

              {(artwork.highResUrl || artwork.imageUrl) && (
                <a
                  href={artwork.highResUrl || artwork.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-center text-xs border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>🖼 لینک فایل</span>
                  <span className="text-[10px]">↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtDetailModal;

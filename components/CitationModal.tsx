// Developed by Kian Mansouri Jamshidi
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Paper } from '../types';
import { generateBibTeX, downloadBibTex } from '../services/citationService';

interface CitationModalProps {
  paper: Paper | null;
  onClose: () => void;
}

const CitationModal: React.FC<CitationModalProps> = ({ paper, onClose }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  if (!paper) return null;

  const bibtex = generateBibTeX(paper);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownload = () => {
      downloadBibTex(paper);
  };

  const content = (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm font-sans" dir="rtl">
      
      {/* Main Container - Glass Style */}
      <div className="glass-panel w-full max-w-lg overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
        
        {/* Decorative Glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-primary opacity-5 rounded-full blur-[40px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-glow opacity-5 rounded-full blur-[40px] pointer-events-none"></div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center relative z-10 bg-white/5">
           <div className="flex flex-col">
               <h3 className="text-xl font-bold font-nastaliq text-gold-primary drop-shadow-sm">استناد به منبع</h3>
               <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase">BIBLIOGRAPHIC DATA</span>
           </div>
           <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-2xl">&times;</button>
        </div>

        {/* Body */}
        <div className="p-6 relative z-10">
            <p className="text-xs text-gray-400 mb-3">فرمت BibTeX (قابل استفاده در مندلی، اندنوت، لاتک):</p>
            
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs text-teal-glow overflow-x-auto whitespace-pre mb-6 select-all scrollbar-thin shadow-inner" dir="ltr">
                {bibtex}
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={handleCopy}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border
                    ${copyStatus === 'copied' 
                        ? 'bg-green-500/20 border-green-500 text-green-400' 
                        : 'bg-teal-glow/10 border-teal-glow/50 text-teal-glow hover:bg-teal-glow hover:text-black hover:shadow-[0_0_15px_rgba(45,212,191,0.3)]'
                    }`}
                >
                    {copyStatus === 'copied' ? (
                        <><span>✓</span> کپی شد</>
                    ) : (
                        <><span>📋</span> کپی در کلیپ‌بورد</>
                    )}
                </button>
                
                <button 
                    onClick={handleDownload}
                    className="flex-1 bg-white/5 border border-white/10 text-gray-300 py-2.5 rounded-lg text-xs font-bold hover:bg-white/10 hover:text-white transition flex items-center justify-center gap-2"
                >
                    <span>💾</span> دانلود فایل .bib
                </button>
            </div>
        </div>

      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default CitationModal;
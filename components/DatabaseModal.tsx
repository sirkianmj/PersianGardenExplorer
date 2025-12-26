// Developed by Kian Mansouri Jamshidi
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Paper, HistoricalPeriod, ResearchTopic } from '../types';
import { saveFile } from '../services/storageService';
import { processAndIndexPaper } from '../services/pdfProcessor';

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

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (paper: Paper) => void;
  initialData?: Paper | null;
}

const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Partial<Paper>>({
    title: '',
    authors: [],
    year: '',
    source: '',
    abstract: '',
    citationKey: '',
    language: 'fa',
    topic: ResearchTopic.GENERAL,
    period: HistoricalPeriod.ALL,
    tags: []
  });
  
  const [authorInput, setAuthorInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>(''); 
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setAuthorInput(initialData.authors.join('; '));
    } else {
      setFormData({
        title: '',
        authors: [],
        year: new Date().getFullYear().toString(),
        source: '',
        abstract: '',
        citationKey: '',
        language: 'fa',
        topic: ResearchTopic.GENERAL,
        period: HistoricalPeriod.ALL,
        tags: [],
        apiSource: 'Local'
      });
      setAuthorInput('');
      setFile(null);
    }
    setSaveStatus('');
  }, [initialData, isOpen]);

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    if (!initialData) {
        const name = selectedFile.name.replace('.pdf', '');
        const parts = name.split('-').map(p => p.trim());
        if (parts.length >= 3) {
             const possibleYear = parts[1].match(/^\d{4}$/) ? parts[1] : '';
             if (possibleYear) {
                 setAuthorInput(parts[0]);
                 setFormData(prev => ({
                     ...prev, 
                     year: possibleYear,
                     title: parts.slice(2).join(' - ')
                 }));
                 return;
             }
        }
        if (!formData.title) {
            setFormData(prev => ({...prev, title: name}));
        }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile.type === 'application/pdf') {
            handleFileSelection(droppedFile);
        } else {
            alert("لطفاً فقط فایل PDF بارگذاری کنید.");
        }
    }
  };

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title?.trim()) newErrors.title = "عنوان الزامی است";
    if (!formData.year?.trim()) newErrors.year = "سال انتشار الزامی است";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    setSaveStatus('در حال پردازش...');

    try {
      const processedAuthors = authorInput
        .split(/;|\\n/)
        .map(a => a.trim())
        .filter(a => a.length > 0);

      let finalKey = formData.citationKey;
      if (!finalKey && processedAuthors.length > 0 && formData.year) {
        const lastName = processedAuthors[0].split(' ').pop()?.toLowerCase() || 'auth';
        finalKey = `${lastName}${formData.year}`;
      }
      
      const id = initialData?.id || crypto.randomUUID();
      const finalTitle = formData.title || 'بدون عنوان';

      if (file) {
        setSaveStatus('ذخیره فایل...');
        await saveFile(id, file);
        
        setSaveStatus('نمایه‌سازی متن...');
        try {
            await processAndIndexPaper(id, finalTitle, processedAuthors, file);
        } catch (indexError) {
            console.error("Indexing failed, but file saved:", indexError);
        }
      }

      const newPaper: Paper = {
        id: id,
        title: finalTitle,
        authors: processedAuthors,
        year: formData.year || 'نامشخص',
        source: formData.source || 'ورودی دستی',
        abstract: formData.abstract || '',
        period: formData.period,
        topic: formData.topic,
        url: formData.url,
        localFileUrl: undefined, 
        tags: formData.tags || [],
        notes: initialData?.notes || [],
        addedAt: initialData?.addedAt || Date.now(),
        isLocal: !!file || (initialData?.isLocal || false),
        language: formData.language as 'en' | 'fa',
        apiSource: initialData?.apiSource || 'Local',
        citationKey: finalKey,
        citationCount: initialData?.citationCount || 0
      };

      onSave(newPaper);
      onClose();
    } catch (err) {
      console.error("Failed to save record:", err);
      alert("خطا در ذخیره‌سازی فایل.");
    } finally {
      setIsSaving(false);
      setSaveStatus('');
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md font-sans" dir="rtl">
      {/* Main Glass Modal */}
      <div className="glass-panel w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative">
        
        {/* Decorative Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-primary opacity-5 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-glow opacity-5 rounded-full blur-[80px] pointer-events-none"></div>

        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center shrink-0 z-10">
          <div>
            <h2 className="text-2xl font-nastaliq text-gold-primary mb-1 drop-shadow-sm">
              {initialData ? 'ویرایش شناسنامه اثر' : 'ثبت سند جدید در آرشیو'}
            </h2>
            <p className="text-xs text-gray-500 font-mono tracking-wider uppercase">
                DIGITAL ASSET MANAGEMENT SYSTEM
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl transition-colors">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
          
          {/* Right Column: Metadata Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <label className="text-xs text-teal-glow font-bold">عنوان سند / کتاب</label>
              <input 
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className={`w-full bg-black/40 border ${errors.title ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-teal-glow/50 focus:ring-0 transition-colors text-sm`}
                placeholder="عنوان کامل اثر را وارد کنید..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                <label className="text-xs text-gray-400">پدیدآورندگان (جداکننده ؛)</label>
                <input 
                  type="text"
                  value={authorInput}
                  onChange={e => setAuthorInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-teal-glow/50 focus:ring-0 transition-colors text-sm"
                  placeholder="مثال: پیرنیا، محمدکریم؛ ..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-xs text-gray-400">سال انتشار</label>
                    <input 
                      type="text"
                      value={formData.year}
                      onChange={e => setFormData({...formData, year: e.target.value})}
                      className={`w-full bg-black/40 border ${errors.year ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-teal-glow/50 focus:ring-0 transition-colors text-sm text-left`}
                      placeholder="YYYY"
                      dir="ltr"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs text-gray-400">زبان</label>
                    <select 
                      value={formData.language}
                      onChange={e => setFormData({...formData, language: e.target.value as 'en' | 'fa'})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-teal-glow/50 focus:ring-0 transition-colors text-sm"
                    >
                      <option value="fa" className="bg-mystic-deep">فارسی</option>
                      <option value="en" className="bg-mystic-deep">English</option>
                    </select>
                 </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400">چکیده / توضیحات</label>
              <textarea 
                rows={6}
                value={formData.abstract}
                onChange={e => setFormData({...formData, abstract: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-teal-glow/50 focus:ring-0 transition-colors text-sm leading-relaxed scrollbar-thin"
                placeholder="متن چکیده را اینجا وارد کنید..."
              />
            </div>
          </div>

          {/* Left Column: Classification & File */}
          <div className="space-y-6">
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5 space-y-4">
              <h3 className="text-xs font-bold text-gold-primary mb-2 flex items-center gap-2 border-b border-white/5 pb-2">
                <span>✦</span> طبقه‌بندی
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                   <label className="text-[10px] text-gray-500">منبع / نشریه</label>
                   <input 
                      type="text"
                      value={formData.source}
                      onChange={e => setFormData({...formData, source: e.target.value})}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:border-gold-primary/30 focus:ring-0"
                    />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">دوره تاریخی</label>
                   <select 
                      value={formData.period}
                      onChange={e => setFormData({...formData, period: e.target.value as HistoricalPeriod})}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:border-gold-primary/30 focus:ring-0"
                    >
                      {Object.values(HistoricalPeriod).map(p => (
                          <option key={p} value={p} className="bg-mystic-deep">{PERIOD_LABELS[p]}</option>
                      ))}
                   </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">موضوع پژوهش</label>
                   <select 
                      value={formData.topic}
                      onChange={e => setFormData({...formData, topic: e.target.value as ResearchTopic})}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 focus:border-gold-primary/30 focus:ring-0"
                    >
                      {Object.values(ResearchTopic).map(t => (
                          <option key={t} value={t} className="bg-mystic-deep">{TOPIC_LABELS[t]}</option>
                      ))}
                   </select>
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] text-gray-500">شناسه استناد (BibTeX)</label>
                   <input 
                      type="text"
                      value={formData.citationKey}
                      onChange={e => setFormData({...formData, citationKey: e.target.value})}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs text-gray-500 font-mono text-left focus:border-gold-primary/30 focus:ring-0"
                      placeholder="Auto-gen"
                      dir="ltr"
                    />
                </div>
              </div>
            </div>

            {/* Holographic Drop Zone */}
            <div 
                className={`
                    relative p-6 rounded-2xl border border-dashed transition-all duration-300 group cursor-pointer overflow-hidden
                    ${isDragging ? 'bg-teal-glow/10 border-teal-glow' : 'bg-black/30 border-white/10 hover:border-teal-glow/50'}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-glow/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${formData.isLocal || file ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400 group-hover:text-teal-glow'}`}>
                      {formData.isLocal || file ? '✓' : '⇩'}
                  </div>
                  
                  <h3 className="text-sm font-bold text-gray-300 mb-1">
                      {formData.isLocal || file ? 'فایل پیوست شد' : 'بارگذاری فایل PDF'}
                  </h3>
                  <p className="text-[10px] text-gray-500">
                      {file ? file.name : (formData.isLocal ? 'فایل موجود است' : 'فایل را اینجا رها کنید')}
                  </p>
              </div>

              <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".pdf"
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelection(e.target.files[0]);
                    }
                  }}
                />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-black/40 border-t border-white/5 px-8 py-5 flex justify-between items-center shrink-0 z-10">
          <div className="text-[10px] text-gray-600 font-mono hidden sm:block">
             ID: {initialData?.id.substring(0,8) || 'NEW_ENTRY'}
          </div>
          <div className="flex gap-4 w-full sm:w-auto justify-end">
             <button 
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition text-xs font-bold"
            >
              انصراف
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-teal-glow/10 border border-teal-glow/50 text-teal-glow px-8 py-2 rounded-lg hover:bg-teal-glow hover:text-black hover:shadow-[0_0_20px_rgba(45,212,191,0.4)] transition-all text-xs font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin h-3 w-3 border-2 border-current border-b-transparent rounded-full"></span>
                  {saveStatus}
                </>
              ) : 'ذخیره نهایی'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DatabaseModal;
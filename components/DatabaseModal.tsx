import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Paper, HistoricalPeriod, ResearchTopic } from '../types';
import { saveFile } from '../services/storageService';

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
  }, [initialData, isOpen]);

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    
    // Intelligent Filename Parsing
    // Try to guess metadata from filename formats like:
    // "Author - Year - Title.pdf" or "Title - Author.pdf"
    if (!initialData) {
        const name = selectedFile.name.replace('.pdf', '');
        const parts = name.split('-').map(p => p.trim());
        
        if (parts.length >= 3) {
             // Heuristic: 1st is Author, 2nd is Year (if numeric), 3rd is Title
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
        
        // Fallback: Just Title
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

      if (file) {
        await saveFile(id, file);
      }

      const newPaper: Paper = {
        id: id,
        title: formData.title || 'بدون عنوان',
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
      alert("خطا در ذخیره‌سازی فایل. لطفاً دسترسی‌ها را بررسی کنید.");
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-garden-dark/60 z-[100] flex items-center justify-center p-2 md:p-4 backdrop-blur-sm font-persian">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[90vh] md:max-h-[90vh] overflow-hidden border border-white/20">
        
        {/* Header with Pattern */}
        <div className="bg-garden-dark bg-pattern-girih text-white px-4 py-4 md:px-8 md:py-6 flex justify-between items-center shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-garden-dark/90"></div>
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-nastaliq text-gold-accent drop-shadow-md">
              {initialData ? 'ویرایش سند آرشیوی' : 'ثبت سند جدید'}
            </h2>
            <p className="text-[10px] md:text-xs text-white/70 mt-1 uppercase tracking-wider font-sans">سامانه مدیریت منابع پژوهشی</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-3xl z-10 transition-colors">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 bg-gray-50/50">
          
          {/* Right Column (Form starts right in RTL) */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">عنوان مقاله / کتاب</label>
              <input 
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-tile-blue focus:border-transparent transition-shadow ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="عنوان کامل اثر را وارد کنید..."
              />
              {errors.title && <span className="text-red-500 text-xs mt-1 block">{errors.title}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
               <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">نویسندگان (جداکننده ؛)</label>
                <input 
                  type="text"
                  value={authorInput}
                  onChange={e => setAuthorInput(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-tile-blue focus:border-transparent transition-shadow"
                  placeholder="مثال: پیرنیا، محمدکریم؛ پوپ، آرتور"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">سال انتشار</label>
                    <input 
                      type="text"
                      value={formData.year}
                      onChange={e => setFormData({...formData, year: e.target.value})}
                      className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-tile-blue focus:border-transparent font-sans text-left ${errors.year ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="YYYY"
                      dir="ltr"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">زبان اثر</label>
                    <select 
                      value={formData.language}
                      onChange={e => setFormData({...formData, language: e.target.value as 'en' | 'fa'})}
                      className="w-full border border-gray-300 p-3 rounded-lg bg-white"
                    >
                      <option value="fa">فارسی</option>
                      <option value="en">انگلیسی</option>
                    </select>
                 </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">چکیده</label>
              <textarea 
                rows={6}
                value={formData.abstract}
                onChange={e => setFormData({...formData, abstract: e.target.value})}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-tile-blue focus:border-transparent text-sm leading-relaxed"
                placeholder="متن چکیده را اینجا وارد کنید..."
              />
            </div>
          </div>

          {/* Left Column (Metadata/File) */}
          <div className="space-y-4 md:space-y-6">
            
            <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-bold text-garden-dark mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                <span className="text-lg">🏷️</span> طبقه‌بندی
              </h3>
              
              <div className="space-y-4">
                <div>
                   <label className="block text-xs text-gray-500 mb-1">منبع / نشریه</label>
                   <input 
                      type="text"
                      value={formData.source}
                      onChange={e => setFormData({...formData, source: e.target.value})}
                      className="w-full border border-gray-300 p-2.5 rounded text-sm focus:border-tile-blue focus:ring-0"
                      placeholder="مثال: مجله باغ نظر"
                    />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">دوره تاریخی</label>
                   <select 
                      value={formData.period}
                      onChange={e => setFormData({...formData, period: e.target.value as HistoricalPeriod})}
                      className="w-full border border-gray-300 p-2.5 rounded text-sm bg-white focus:border-tile-blue focus:ring-0"
                    >
                      {Object.values(HistoricalPeriod).map(p => (
                          <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                      ))}
                   </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">موضوع پژوهش</label>
                   <select 
                      value={formData.topic}
                      onChange={e => setFormData({...formData, topic: e.target.value as ResearchTopic})}
                      className="w-full border border-gray-300 p-2.5 rounded text-sm bg-white focus:border-tile-blue focus:ring-0"
                    >
                      {Object.values(ResearchTopic).map(t => (
                          <option key={t} value={t}>{TOPIC_LABELS[t]}</option>
                      ))}
                   </select>
                </div>

                <div>
                   <label className="block text-xs text-gray-500 mb-1">کلید ارجاع (BibTeX)</label>
                   <input 
                      type="text"
                      value={formData.citationKey}
                      onChange={e => setFormData({...formData, citationKey: e.target.value})}
                      className="w-full border border-gray-300 p-2.5 rounded text-sm font-mono text-gray-600 text-left bg-gray-50"
                      placeholder="Auto-gen"
                      dir="ltr"
                    />
                </div>
              </div>
            </div>

            {/* Drag & Drop File Area */}
            <div 
                className={`
                    p-4 md:p-5 rounded-xl border-2 border-dashed shadow-inner transition-all duration-300
                    ${isDragging ? 'bg-cyan-100 border-tile-blue scale-105' : 'bg-cyan-50 border-cyan-200'}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
              <h3 className="text-sm font-bold text-cyan-900 mb-2 border-b border-cyan-200 pb-2 flex items-center gap-2">
                <span className="text-lg">💾</span> فایل دیجیتال (PDF)
              </h3>
              
              {(formData.isLocal || file) ? (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-green-800 text-sm font-medium bg-green-100/50 border border-green-200 p-3 rounded-lg">
                    <span className="text-xl">✓</span> 
                    <div className="truncate max-w-[150px]" dir="ltr">
                        {file ? file.name : 'فایل پیوست شده است'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 mb-3 text-center leading-loose">
                    فایل را اینجا رها کنید<br/>
                    <span className="text-xs opacity-70">یا برای انتخاب کلیک کنید</span>
                </div>
              )}

              <label className="cursor-pointer block w-full bg-white border border-cyan-300 text-cyan-700 py-3 px-3 rounded-lg text-center text-sm hover:bg-cyan-50 hover:border-cyan-400 transition-all shadow-sm">
                {formData.isLocal || file ? 'جایگزینی فایل' : 'انتخاب فایل PDF'}
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
              </label>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-4 md:px-8 md:py-5 flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-400 font-sans hidden sm:block" dir="ltr">
            {initialData ? `Record ID: ${initialData.id.substring(0,8)}...` : 'New Entry'}
          </div>
          <div className="flex gap-4 w-full sm:w-auto justify-end">
             <button 
              onClick={onClose}
              className="px-4 md:px-6 py-2.5 rounded-lg text-gray-600 hover:bg-gray-200 transition text-sm font-medium"
            >
              انصراف
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-garden-dark text-white px-6 md:px-8 py-2.5 rounded-lg shadow hover:bg-tile-dark hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? 'در حال پردازش...' : 'ذخیره در آرشیو'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DatabaseModal;
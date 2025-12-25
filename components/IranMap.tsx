import React, { useState } from 'react';

interface Province {
  id: string;
  nameFa: string;
  nameEn: string;
  path: string;
}

// Simplified Paths for major provinces (Optimized for Web/Tauri performance)
const PROVINCES: Province[] = [
  { id: 'AZ-E', nameFa: 'آذربایجان شرقی', nameEn: 'East Azerbaijan', path: 'M168.5,58.3 L180.2,45.1 L205.6,52.8 L215.1,75.2 L195.4,85.6 L175.2,78.1 Z' },
  { id: 'AZ-W', nameFa: 'آذربایجان غربی', nameEn: 'West Azerbaijan', path: 'M145.2,35.5 L168.5,58.3 L175.2,78.1 L165.1,105.2 L140.5,95.6 L135.2,65.1 Z' },
  { id: 'ARD', nameFa: 'اردبیل', nameEn: 'Ardabil', path: 'M205.6,52.8 L225.1,48.2 L235.5,65.1 L215.1,75.2 Z' },
  { id: 'GIL', nameFa: 'گیلان', nameEn: 'Gilan', path: 'M215.1,75.2 L235.5,65.1 L255.2,75.6 L265.1,85.2 L245.5,95.1 L215.1,88.5 Z' },
  { id: 'MAZ', nameFa: 'مازندران', nameEn: 'Mazandaran', path: 'M265.1,85.2 L325.5,85.2 L345.1,95.6 L335.2,115.1 L275.5,105.2 Z' },
  { id: 'GOL', nameFa: 'گلستان', nameEn: 'Golestan', path: 'M325.5,85.2 L365.2,75.1 L385.5,95.2 L345.1,95.6 Z' },
  { id: 'KHR', nameFa: 'خراسان رضوی', nameEn: 'Razavi Khorasan', path: 'M385.5,95.2 L455.1,115.2 L445.5,185.1 L395.2,165.5 L365.1,125.2 Z' },
  { id: 'KHN', nameFa: 'خراسان شمالی', nameEn: 'North Khorasan', path: 'M345.1,95.6 L385.5,95.2 L365.1,125.2 L335.2,115.1 Z' },
  { id: 'KHS', nameFa: 'خراسان جنوبی', nameEn: 'South Khorasan', path: 'M395.2,165.5 L445.5,185.1 L435.2,255.5 L365.1,235.2 L355.5,185.1 Z' },
  { id: 'SEM', nameFa: 'سمنان', nameEn: 'Semnan', path: 'M275.5,105.2 L335.2,115.1 L365.1,125.2 L355.5,185.1 L295.2,165.5 L265.1,135.2 Z' },
  { id: 'TEH', nameFa: 'تهران', nameEn: 'Tehran', path: 'M245.5,95.1 L265.1,85.2 L275.5,105.2 L265.1,135.2 L245.5,115.1 Z' },
  { id: 'ALB', nameFa: 'البرز', nameEn: 'Alborz', path: 'M235.5,105.1 L245.5,95.1 L245.5,115.1 L235.5,112.1 Z' },
  { id: 'QOM', nameFa: 'قم', nameEn: 'Qom', path: 'M235.5,135.2 L265.1,135.2 L260.5,155.1 L235.5,145.2 Z' },
  { id: 'MRK', nameFa: 'مرکزی', nameEn: 'Markazi', path: 'M205.5,135.2 L235.5,135.2 L235.5,145.2 L245.5,165.1 L215.1,175.2 L195.5,145.2 Z' },
  { id: 'QAZ', nameFa: 'قزوین', nameEn: 'Qazvin', path: 'M215.1,88.5 L245.5,95.1 L235.5,112.1 L205.5,135.2 L195.4,105.2 Z' },
  { id: 'ZNJ', nameFa: 'زنجان', nameEn: 'Zanjan', path: 'M195.4,85.6 L215.1,88.5 L195.4,105.2 L175.2,115.1 L175.2,78.1 Z' },
  { id: 'KRD', nameFa: 'کردستان', nameEn: 'Kurdistan', path: 'M140.5,95.6 L165.1,105.2 L175.2,115.1 L175.5,145.2 L135.2,135.1 Z' },
  { id: 'KRM', nameFa: 'کرمانشاه', nameEn: 'Kermanshah', path: 'M115.1,135.2 L135.2,135.1 L145.5,165.1 L115.1,155.2 Z' },
  { id: 'HAM', nameFa: 'همدان', nameEn: 'Hamadan', path: 'M175.5,145.2 L195.5,145.2 L185.2,165.1 L145.5,165.1 Z' },
  { id: 'LOR', nameFa: 'لرستان', nameEn: 'Lorestan', path: 'M145.5,165.1 L185.2,165.1 L215.1,175.2 L195.5,205.2 L155.2,195.1 Z' },
  { id: 'ILM', nameFa: 'ایلام', nameEn: 'Ilam', path: 'M105.1,165.1 L115.1,155.2 L145.5,165.1 L135.2,195.1 Z' },
  { id: 'KHZ', nameFa: 'خوزستان', nameEn: 'Khuzestan', path: 'M135.2,195.1 L155.2,195.1 L195.5,205.2 L185.2,255.5 L125.1,235.2 Z' },
  { id: 'CHB', nameFa: 'چهارمحال و بختیاری', nameEn: 'Chaharmahal and Bakhtiari', path: 'M195.5,205.2 L225.1,205.2 L225.1,225.2 L195.5,225.2 Z' },
  { id: 'KOH', nameFa: 'کهگیلویه و بویراحمد', nameEn: 'Kohgiluyeh and Boyer-Ahmad', path: 'M195.5,225.2 L245.5,235.2 L235.5,255.1 L185.2,255.5 Z' },
  { id: 'BUS', nameFa: 'بوشهر', nameEn: 'Bushehr', path: 'M185.2,255.5 L235.5,255.1 L255.2,285.2 L205.5,295.1 Z' },
  { id: 'FRS', nameFa: 'فارس', nameEn: 'Fars', path: 'M225.1,225.2 L285.2,215.1 L325.5,255.1 L295.2,305.2 L245.5,285.2 L235.5,255.1 L245.5,235.2 Z' },
  { id: 'HRM', nameFa: 'هرمزگان', nameEn: 'Hormozgan', path: 'M295.2,305.2 L325.5,255.1 L395.2,265.2 L405.5,305.2 L335.2,315.1 Z' },
  { id: 'KER', nameFa: 'کرمان', nameEn: 'Kerman', path: 'M295.2,165.5 L355.5,185.1 L365.1,235.2 L395.2,265.2 L325.5,255.1 L285.2,215.1 L275.5,175.2 Z' },
  { id: 'YAZ', nameFa: 'یزد', nameEn: 'Yazd', path: 'M245.5,165.1 L295.2,165.5 L275.5,175.2 L285.2,215.1 L225.1,225.2 L225.1,205.2 L205.5,195.2 L215.1,175.2 Z' },
  { id: 'ISF', nameFa: 'اصفهان', nameEn: 'Isfahan', path: 'M215.1,175.2 L245.5,165.1 L235.5,145.2 L260.5,155.1 L265.1,135.2 L295.2,165.5 L275.5,175.2 L225.1,205.2 L215.1,175.2 Z' }, 
  { id: 'SIS', nameFa: 'سیستان و بلوچستان', nameEn: 'Sistan and Baluchestan', path: 'M365.1,235.2 L435.2,255.5 L445.5,355.1 L375.2,335.1 L395.2,265.2 Z' },
];

interface IranMapProps {
  onProvinceSelect: (query: string) => void;
}

const IranMap: React.FC<IranMapProps> = ({ onProvinceSelect }) => {
  const [hoveredProvince, setHoveredProvince] = useState<Province | null>(null);

  const handleProvinceClick = (province: Province) => {
    // POWERFUL SEARCH ALGORITHM:
    // We construct a specific "Composite Query" consisting of:
    // 1. Persian Keywords: "باغ" (Garden) + Province Name (e.g., "باغ های شیراز")
    // 2. English Keywords: Province Name + "Garden Architecture"
    // 
    // The Gemini Service will strictly separate these to prevent "OR" boolean leaks.
    // Example: "باغ های تاریخی زنجان Zanjan Historical Gardens"
    const query = `باغ های تاریخی ${province.nameFa} ${province.nameEn} Historical Gardens`;
    onProvinceSelect(query);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 relative bg-gradient-to-br from-paper-bg to-white overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-tile-blue opacity-5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-clay-accent opacity-5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="z-10 text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-nastaliq text-garden-dark mb-2">اطلس باغ‌های ایرانی</h2>
        <p className="text-gray-500 font-sans text-sm md:text-base">
          برای جستجوی هوشمند مقالات، استان مورد نظر را روی نقشه انتخاب کنید
        </p>
      </div>

      <div className="relative w-full max-w-4xl aspect-[1.4/1] bg-white/50 backdrop-blur-sm rounded-2xl border border-white shadow-xl p-4 flex items-center justify-center">
        
        {/* Hover Info Card */}
        <div className={`
            absolute top-6 right-6 z-20 bg-white/90 backdrop-blur border border-tile-blue/30 rounded-lg p-4 shadow-lg transition-all duration-300 transform pointer-events-none
            ${hoveredProvince ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        `}>
             <h3 className="font-bold text-lg text-garden-dark border-b border-gray-200 pb-1 mb-1">
                {hoveredProvince?.nameFa}
             </h3>
             <p className="text-xs text-gray-500 font-sans font-medium uppercase tracking-wide">
                {hoveredProvince?.nameEn}
             </p>
             <p className="text-[10px] text-tile-blue mt-2 flex items-center gap-1">
                <span>🔍</span> کلیک برای جستجوی تخصصی
             </p>
        </div>

        {/* SVG Map */}
        <svg 
            viewBox="100 0 350 360" 
            className="w-full h-full drop-shadow-lg"
            xmlns="http://www.w3.org/2000/svg"
        >
          {PROVINCES.map((province) => (
            <g key={province.id} 
               onClick={() => handleProvinceClick(province)}
               onMouseEnter={() => setHoveredProvince(province)}
               onMouseLeave={() => setHoveredProvince(null)}
               className="cursor-pointer transition-all duration-300 group"
            >
              <path
                d={province.path}
                className="fill-garden-light stroke-white stroke-[1.5] transition-all duration-300 ease-out 
                           group-hover:fill-tile-blue group-hover:stroke-garden-dark group-hover:stroke-[2] 
                           group-active:fill-tile-dark"
              />
            </g>
          ))}
          
          {/* Persian Gulf Label */}
          <text x="250" y="340" className="fill-tile-blue/40 text-sm font-nastaliq pointer-events-none">خلیج فارس</text>
          
          {/* Caspian Sea Label */}
          <text x="250" y="40" className="fill-tile-blue/40 text-sm font-nastaliq pointer-events-none">دریای خزر</text>
        </svg>

      </div>

      <div className="mt-8 text-center text-xs text-gray-400 font-sans">
        نقشه شماتیک تقسیمات استانی ایران | طراحی اختصاصی برای سامانه پردیس
      </div>
    </div>
  );
};

export default IranMap;
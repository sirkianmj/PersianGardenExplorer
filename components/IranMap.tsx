import React, { useState } from 'react';

interface Province {
  id: string;
  nameFa: string;
  nameEn: string;
  path: string;
}

// Simplified Paths for major provinces
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
    const query = `باغ های تاریخی ${province.nameFa} ${province.nameEn} Historical Gardens`;
    onProvinceSelect(query);
  };

  return (
    <div className="w-full h-full p-4 relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Container - Glass Card Style */}
      <div className="glass-panel w-full h-full max-w-5xl relative p-8 flex flex-col md:flex-row items-center justify-center gap-8">
        
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none rounded-2xl"></div>

        {/* Text Area */}
        <div className="absolute top-6 left-6 z-10 text-right">
            <h2 className="text-3xl font-nastaliq text-gold-primary mb-2 drop-shadow-md">اطلس جغرافیایی</h2>
            <p className="text-sm text-text-muted">تحلیل مکانی باغ‌های تاریخی</p>
        </div>

        {/* Info Box */}
        <div className={`
            absolute bottom-6 right-6 z-20 glass-panel p-4 border border-teal-glow/30 min-w-[200px]
            transition-all duration-300 transform
            ${hoveredProvince ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}>
             <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <span className="w-2 h-2 rounded-full bg-teal-glow shadow-glow-teal animate-pulse"></span>
                <span className="text-xs text-teal-glow font-bold">منطقه انتخاب شده</span>
             </div>
             <h3 className="font-bold text-xl text-text-primary mb-1">
                {hoveredProvince?.nameFa}
             </h3>
             <p className="text-xs text-text-muted font-sans">
                {hoveredProvince?.nameEn}
             </p>
        </div>

        {/* Map SVG */}
        <svg 
            viewBox="100 0 350 360" 
            className="w-full max-h-[80vh] drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 0 20px rgba(45, 212, 191, 0.1))' }}
            xmlns="http://www.w3.org/2000/svg"
        >
          {PROVINCES.map((province) => (
            <g key={province.id} 
               onClick={() => handleProvinceClick(province)}
               onMouseEnter={() => setHoveredProvince(province)}
               onMouseLeave={() => setHoveredProvince(null)}
               className="cursor-pointer transition-all duration-500 group"
            >
              <path
                d={province.path}
                className="fill-mystic-deep/50 stroke-white/20 stroke-[0.5] transition-all duration-300
                           group-hover:fill-teal-glow/10 group-hover:stroke-gold-primary group-hover:stroke-[1.5]"
              />
            </g>
          ))}
          
          <text x="250" y="340" className="fill-white/10 text-xs font-nastaliq pointer-events-none">خلیج فارس</text>
          <text x="250" y="40" className="fill-white/10 text-xs font-nastaliq pointer-events-none">دریای خزر</text>
        </svg>

      </div>
    </div>
  );
};

export default IranMap;
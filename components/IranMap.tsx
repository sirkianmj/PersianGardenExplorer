// Developed by Kian Mansouri Jamshidi
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LocationMarker {
  id: string;
  nameFa: string;
  nameEn: string;
  lat: number;
  lng: number;
  type: 'city' | 'landscape';
}

// REAL GEOGRAPHIC COORDINATES
const LOCATIONS: LocationMarker[] = [
  // --- MAJOR CITIES ---
  { id: 'TAB', lat: 38.0800, lng: 46.2919, nameFa: 'تبریز', nameEn: 'Tabriz', type: 'city' },
  { id: 'ARD', lat: 38.2498, lng: 48.2972, nameFa: 'اردبیل', nameEn: 'Ardabil', type: 'city' },
  { id: 'URM', lat: 37.5498, lng: 45.0786, nameFa: 'ارومیه', nameEn: 'Urmia', type: 'city' },
  { id: 'RAS', lat: 37.2682, lng: 49.5891, nameFa: 'رشت', nameEn: 'Rasht', type: 'city' },
  { id: 'ZNJ', lat: 36.6744, lng: 48.4845, nameFa: 'زنجان', nameEn: 'Zanjan', type: 'city' },
  { id: 'QAZ', lat: 36.2797, lng: 50.0049, nameFa: 'قزوین', nameEn: 'Qazvin', type: 'city' },
  { id: 'TEH', lat: 35.6892, lng: 51.3890, nameFa: 'تهران', nameEn: 'Tehran', type: 'city' },
  { id: 'KRJ', lat: 35.8400, lng: 50.9391, nameFa: 'کرج', nameEn: 'Karaj', type: 'city' },
  { id: 'SEM', lat: 35.5729, lng: 53.3971, nameFa: 'سمنان', nameEn: 'Semnan', type: 'city' },
  { id: 'QOM', lat: 34.6401, lng: 50.8764, nameFa: 'قم', nameEn: 'Qom', type: 'city' },
  { id: 'GRG', lat: 36.8456, lng: 54.4393, nameFa: 'گرگان', nameEn: 'Gorgan', type: 'city' },
  { id: 'BJN', lat: 37.4761, lng: 57.3324, nameFa: 'بجنورد', nameEn: 'Bojnord', type: 'city' },
  { id: 'MHD', lat: 36.2605, lng: 59.6168, nameFa: 'مشهد', nameEn: 'Mashhad', type: 'city' },
  { id: 'BIR', lat: 32.8649, lng: 59.2265, nameFa: 'بیرجند', nameEn: 'Birjand', type: 'city' },
  { id: 'SND', lat: 35.3144, lng: 46.9923, nameFa: 'سنندج', nameEn: 'Sanandaj', type: 'city' },
  { id: 'HAM', lat: 34.7989, lng: 48.5150, nameFa: 'همدان', nameEn: 'Hamadan', type: 'city' },
  { id: 'KRM', lat: 34.3142, lng: 47.0650, nameFa: 'کرمانشاه', nameEn: 'Kermanshah', type: 'city' },
  { id: 'ILM', lat: 33.6374, lng: 46.4227, nameFa: 'ایلام', nameEn: 'Ilam', type: 'city' },
  { id: 'KHM', lat: 33.4878, lng: 48.3558, nameFa: 'خرم‌آباد', nameEn: 'Khorramabad', type: 'city' },
  { id: 'ARK', lat: 34.0954, lng: 49.6909, nameFa: 'اراک', nameEn: 'Arak', type: 'city' },
  { id: 'KSH', lat: 33.9850, lng: 51.4100, nameFa: 'کاشان', nameEn: 'Kashan', type: 'city' },
  { id: 'ISF', lat: 32.6539, lng: 51.6660, nameFa: 'اصفهان', nameEn: 'Isfahan', type: 'city' },
  { id: 'YZD', lat: 31.8974, lng: 54.3569, nameFa: 'یزد', nameEn: 'Yazd', type: 'city' },
  { id: 'AHV', lat: 31.3183, lng: 48.6706, nameFa: 'اهواز', nameEn: 'Ahvaz', type: 'city' },
  { id: 'SHK', lat: 32.3256, lng: 50.8644, nameFa: 'شهرکرد', nameEn: 'Shahr-e Kord', type: 'city' },
  { id: 'YAS', lat: 30.6684, lng: 51.5876, nameFa: 'یاسوج', nameEn: 'Yasuj', type: 'city' },
  { id: 'BSH', lat: 28.9234, lng: 50.8203, nameFa: 'بوشهر', nameEn: 'Bushehr', type: 'city' },
  { id: 'SHZ', lat: 29.5918, lng: 52.5837, nameFa: 'شیراز', nameEn: 'Shiraz', type: 'city' },
  { id: 'KER', lat: 30.2839, lng: 57.0834, nameFa: 'کرمان', nameEn: 'Kerman', type: 'city' },
  { id: 'BND', lat: 27.1832, lng: 56.2666, nameFa: 'بندرعباس', nameEn: 'Bandar Abbas', type: 'city' },
  { id: 'ZHD', lat: 29.4963, lng: 60.8629, nameFa: 'زاهدان', nameEn: 'Zahedan', type: 'city' },
  { id: 'CHB', lat: 25.2837, lng: 60.6258, nameFa: 'چابهار', nameEn: 'Chabahar', type: 'city' },
  
  // --- STRATEGIC ISLANDS (PERSIAN GULF) ---
  { id: 'KHG', lat: 29.2396, lng: 50.3168, nameFa: 'خارگ', nameEn: 'Kharg Island', type: 'landscape' },
  { id: 'LAV', lat: 26.8042, lng: 53.2713, nameFa: 'لاوان', nameEn: 'Lavan Island', type: 'landscape' },
  { id: 'KSH_IS', lat: 26.5381, lng: 53.9789, nameFa: 'کیش', nameEn: 'Kish Island', type: 'landscape' },
  { id: 'SIR', lat: 25.9125, lng: 54.5236, nameFa: 'سیری', nameEn: 'Siri Island', type: 'landscape' },
  { id: 'QSH', lat: 26.7570, lng: 55.8427, nameFa: 'قشم', nameEn: 'Qeshm Island', type: 'landscape' },
  { id: 'HOR', lat: 27.0673, lng: 56.4539, nameFa: 'هرمز', nameEn: 'Hormuz Island', type: 'landscape' },
  { id: 'TBK', lat: 26.2417, lng: 55.1500, nameFa: 'تنب کوچک', nameEn: 'Lesser Tunb', type: 'landscape' },
  { id: 'TBZ', lat: 26.2597, lng: 55.3039, nameFa: 'تنب بزرگ', nameEn: 'Greater Tunb', type: 'landscape' },
  { id: 'ABU', lat: 25.8772, lng: 55.0392, nameFa: 'ابوموسی', nameEn: 'Abu Musa', type: 'landscape' },
];

interface IranMapProps {
  onProvinceSelect: (query: string) => void;
}

const IranMap: React.FC<IranMapProps> = ({ onProvinceSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // 1. Initialize Map
    // Center roughly on Iran, Zoom 5 for overview
    const map = L.map(mapContainer.current, {
      center: [32.4279, 53.6880],
      zoom: 5,
      zoomControl: false, // We'll add custom control or keep it clean
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true
    });

    // 2. Add Tile Layer (CartoDB Dark Matter for the "Professional" look)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // 3. Add Custom Markers
    LOCATIONS.forEach(loc => {
      // Custom HTML Icon to preserve the "Glowing Dot" aesthetic
      const customIcon = L.divIcon({
        className: 'custom-marker', // Helper class, styling is inline below
        html: `
          <div class="relative flex items-center justify-center group cursor-pointer transform transition-transform hover:scale-125">
             <div class="absolute inset-0 rounded-full animate-ping opacity-75 ${loc.type === 'landscape' ? 'bg-cyan-400' : 'bg-gold-primary'} w-full h-full"></div>
             <div class="relative rounded-full shadow-[0_0_10px_rgba(0,0,0,1)] border border-white/80 ${loc.type === 'landscape' ? 'w-2 h-2 md:w-2.5 md:h-2.5 bg-cyan-500' : 'w-2.5 h-2.5 md:w-3 md:h-3 bg-gold-primary'}"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(map);
      
      // Custom Popup content
      const popupContent = `
        <div class="font-sans text-center min-w-[120px]">
          <h3 class="font-nastaliq text-lg text-gold-primary mb-1">${loc.nameFa}</h3>
          <p class="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-2">${loc.nameEn}</p>
          <button id="btn-${loc.id}" class="bg-teal-glow/10 border border-teal-glow/30 text-teal-glow hover:bg-teal-glow hover:text-black w-full py-1 rounded text-xs font-bold transition-colors">
            مشاهده باغ‌ها
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: 'glass-popup'
      });

      // Event Listeners
      marker.on('popupopen', () => {
        // We need to attach the click listener after the popup is inserted into DOM
        setTimeout(() => {
          document.getElementById(`btn-${loc.id}`)?.addEventListener('click', () => {
            const query = `باغ های تاریخی ${loc.nameFa} ${loc.nameEn} Historical Gardens Architecture`;
            onProvinceSelect(query);
            map.closePopup();
          });
        }, 50);
      });
      
      marker.on('mouseover', function (this: any) {
        this.openPopup();
      });
    });

    // 4. Add Attribution (Bottom Right, Styled)
    L.control.attribution({ prefix: false }).addAttribution('OpenStreetMap | CartoDB').addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [onProvinceSelect]);

  return (
    <div className="w-full h-full p-2 md:p-6 relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Container - Glass Atlas Frame */}
      <div className="glass-panel w-full h-full max-w-7xl relative flex flex-col items-center justify-center overflow-hidden border-gold-primary/20 bg-[#050505]">
        
        {/* Info Header */}
        <div className="absolute top-6 left-6 z-[401] text-right bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 pointer-events-none">
            <h2 className="text-2xl md:text-3xl font-nastaliq text-gold-primary mb-2 drop-shadow-md">نقشه تعاملی ایران</h2>
            <p className="text-xs md:text-sm text-gray-300 font-sans flex items-center gap-2 justify-end">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                وضعیت: آنلاین (OpenStreetMap)
            </p>
        </div>

        {/* Main Map Container */}
        <div className="relative w-full h-full md:mt-0 select-none shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border border-white/5 bg-[#0a0f14]">
            <div ref={mapContainer} className="w-full h-full z-10" />
            
            {/* Vignette Overlay for focus/aesthetic */}
            <div className="absolute inset-0 bg-[radial-gradient(transparent_60%,#0B0F12_100%)] pointer-events-none z-[400]"></div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/10 flex gap-6 z-[401]">
             <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-gold-primary border border-white shadow-[0_0_10px_#D4AF37]"></div>
                 <span className="text-xs text-gray-200">شهرها</span>
             </div>
             <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-cyan-500 border border-white shadow-[0_0_10px_#06b6d4]"></div>
                 <span className="text-xs text-gray-200">جزایر / مناطق</span>
             </div>
        </div>

      </div>
    </div>
  );
};

export default IranMap;
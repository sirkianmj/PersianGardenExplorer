import React from 'react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  savedCount: number;
  isOpen: boolean;
  onClose: () => void;
  mode: 'expanded' | 'compact';
  onToggleMode: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onChangeView, 
  savedCount, 
  isOpen, 
  onClose,
  mode,
  onToggleMode
}) => {
  const navItems = [
    { id: View.SEARCH, label: 'کاوش در منابع', icon: '🔍' },
    { id: View.LIBRARY, label: 'کتابخانه من', icon: '📚', badge: savedCount },
    { id: View.READER, label: 'سالن مطالعه', icon: '📖' },
    { id: View.SETTINGS, label: 'تنظیمات', icon: '⚙️' },
  ];

  const isCompact = mode === 'compact';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed md:relative inset-y-0 right-0 z-40
          bg-garden-dark bg-pattern-girih text-white 
          flex flex-col shadow-2xl flex-shrink-0 
          font-persian border-l-4 border-clay-accent 
          transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          ${isCompact ? 'md:w-20' : 'md:w-72'}
          w-72
        `}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-garden-dark/90 to-garden-dark/95 z-0 pointer-events-none"></div>

        {/* Header */}
        <div className={`
            border-b border-white/10 z-10 relative flex flex-col items-center justify-center transition-all duration-300
            ${isCompact ? 'p-4 h-24' : 'p-6 h-auto'}
        `}>
           {/* Mobile Close Button */}
           <button 
             onClick={onClose}
             className="absolute top-4 left-4 text-white/50 hover:text-white md:hidden"
           >
             ✕
           </button>

          <div className={`
              border-2 border-gold-accent/50 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-sm shadow-inner transition-all duration-300
              ${isCompact ? 'w-10 h-10 mb-0' : 'w-16 h-16 mb-3'}
          `}>
               <span className={`${isCompact ? 'text-xl' : 'text-3xl'} filter drop-shadow-lg`}>🌿</span>
          </div>
          
          <div className={`text-center transition-opacity duration-300 ${isCompact ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            <h1 className="text-2xl text-white font-nastaliq nastaliq-h1 mb-0 drop-shadow-md text-gold-accent whitespace-nowrap">
                کاوشگر باغ ایرانی
            </h1>
            <p className="text-[10px] text-tile-blue font-light tracking-widest mt-1 opacity-90 uppercase">
                سامانه پژوهشی معماری و منظر
            </p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 z-10 px-3 overflow-x-hidden">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onChangeView(item.id);
                    onClose();
                  }}
                  title={isCompact ? item.label : ''}
                  className={`w-full flex items-center rounded-lg transition-all duration-300 group relative
                    ${isCompact ? 'justify-center px-0 py-3' : 'px-4 py-3'}
                    ${currentView === item.id 
                      ? 'bg-white/10 text-white font-bold shadow-lg border border-white/10 backdrop-blur-sm' 
                      : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                >
                  <span className={`
                    text-lg transition-transform duration-300 flex-shrink-0
                    ${currentView === item.id ? 'scale-110 text-tile-blue' : 'group-hover:text-tile-blue'}
                    ${isCompact ? '' : 'ml-3'}
                  `}>
                      {item.icon}
                  </span>
                  
                  <span className={`
                    text-right whitespace-nowrap transition-all duration-300 origin-right
                    ${isCompact ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 flex-1'}
                  `}>
                      {item.label}
                  </span>

                  {/* Badge */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`
                        bg-clay-accent text-white text-[10px] rounded-full flex items-center justify-center shadow-sm absolute
                        ${isCompact ? 'top-1 right-2 w-4 h-4 text-[9px]' : 'relative top-auto right-auto min-w-[20px] px-2 py-0.5'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer / Toggle */}
        <div className="p-4 border-t border-white/10 z-10 bg-black/10 flex flex-col items-center">
            {/* Collapse Toggle for Desktop */}
            <button 
                onClick={onToggleMode}
                className="hidden md:flex items-center justify-center w-full p-2 text-white/50 hover:text-white hover:bg-white/5 rounded transition mb-2 group"
                title={isCompact ? "باز کردن منو" : "بستن منو"}
            >
                {isCompact ? (
                    <span className="transform rotate-180">➜</span>
                ) : (
                    <div className="flex items-center gap-2">
                        <span>➜</span>
                        <span className="text-xs">جمع کردن منو</span>
                    </div>
                )}
            </button>

          <div className={`text-center p-3 rounded border border-white/5 bg-white/5 w-full transition-all duration-300 ${isCompact ? 'hidden' : 'block'}`}>
              <p className="text-xs text-gold-accent/80 font-nastaliq leading-loose">
                  «چو باغی که هر گوشه‌اش گلشن است»
              </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
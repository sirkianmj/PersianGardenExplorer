// Developed by Kian Mansouri Jamshidi
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
  onClose
}) => {
  // Removed READER from navItems as it should only be accessed by clicking a paper
  const navItems = [
    { id: View.SEARCH, label: 'کاوشگر', icon: '🔍' },
    { id: View.ATLAS, label: 'اطلس مکانی', icon: '🌍' },
    { id: View.TIMELINE, label: 'کرونولوژی', icon: '⏳' },
    { id: View.LIBRARY, label: 'آرشیو دیجیتال', icon: '📚', badge: savedCount },
    { id: View.SETTINGS, label: 'تنظیمات', icon: '⚙️' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Container */}
      <aside 
        className={`
          fixed md:relative inset-y-0 right-0 md:right-auto md:left-0 z-[60]
          w-64 md:w-24 lg:w-24 
          flex flex-col items-center py-6
          bg-[#0B0F12] border-l md:border-l-0 md:border-r border-white/5
          transition-transform duration-300 ease-out shadow-2xl md:shadow-none
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo Area */}
        <div className="mb-8 md:mb-10 flex flex-col items-center justify-center pt-4 md:pt-0">
            <div className="w-12 h-12 rounded-xl border border-gold-primary/30 flex items-center justify-center bg-gold-primary/5 shadow-glow-gold relative rotate-45 mb-4">
                <div className="w-8 h-8 border border-gold-primary/50 absolute inset-0 m-auto"></div>
                <span className="-rotate-45 text-2xl text-gold-primary">❦</span>
            </div>
            <h1 className="md:hidden text-lg font-nastaliq text-gold-primary mt-2">کاوشگر باغ ایرانی</h1>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 w-full space-y-2 px-3">
            {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => { onChangeView(item.id); onClose(); }}
                        className={`
                            group w-full flex md:flex-col items-center md:justify-center gap-4 md:gap-1 px-4 py-3 md:py-3 relative rounded-xl transition-all duration-300
                            ${isActive ? 'bg-white/5' : 'hover:bg-white/5'}
                        `}
                        title={item.label}
                    >
                        {/* Mobile: Active Indicator (Right Border) */}
                        <div className={`
                            absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-gold-primary rounded-l-full shadow-glow-gold transition-all duration-300 md:hidden
                            ${isActive ? 'opacity-100' : 'opacity-0'}
                        `}></div>

                        {/* Desktop: Active Indicator (Left Border) */}
                        <div className={`
                            absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-gold-primary rounded-r-full shadow-glow-gold transition-all duration-300 hidden md:block
                            ${isActive ? 'opacity-100' : 'opacity-0 h-0'}
                        `}></div>

                        <div className={`
                            text-xl md:text-2xl transition-all duration-300 relative
                            ${isActive ? 'text-gold-primary scale-110' : 'text-gray-500 group-hover:text-gray-300'}
                        `}>
                            {item.icon}
                            {item.badge !== undefined && item.badge > 0 && (
                                <span className="absolute -top-1 -right-2 bg-teal-glow text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-glow-teal">
                                    {item.badge}
                                </span>
                            )}
                        </div>
                        
                        <span className={`
                            text-sm md:text-[10px] font-medium transition-colors duration-300 flex-1 md:flex-none text-right md:text-center
                            ${isActive ? 'text-text-primary' : 'text-gray-600 group-hover:text-gray-400'}
                        `}>
                            {item.label}
                        </span>
                        
                        {/* Mobile Chevron */}
                        <span className="md:hidden text-gray-700 text-xs">❮</span>
                    </button>
                );
            })}
        </nav>

        {/* Bottom Status */}
        <div className="mt-auto pt-4 flex flex-col items-center gap-2 pb-safe">
            <div className="w-8 h-8 rounded-full bg-teal-glow/10 border border-teal-glow/30 flex items-center justify-center text-teal-glow text-xs shadow-glow-teal">
                <span className="animate-pulse">●</span>
            </div>
            <span className="text-[10px] text-gray-600 md:hidden">اتصال برقرار است</span>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;
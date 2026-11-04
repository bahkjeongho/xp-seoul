import React from 'react';

interface MenuNavProps {
  activeMenu: 'wiki' | 'blog' | 'about';
  onSelectMenu: (menu: 'wiki' | 'blog' | 'about') => void;
  isCompact?: boolean;
}

export const MenuNav: React.FC<MenuNavProps> = ({ activeMenu, onSelectMenu, isCompact = false }) => {
  return (
    <nav className={`h-full flex flex-col justify-between py-8 px-6 border-l border-[#eeeeee] bg-white select-none transition-all duration-300 ${isCompact ? 'w-[140px]' : 'w-[180px] lg:w-[220px]'}`}>
      <div className="flex flex-col gap-8">
        {/* Menu Section Header */}
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-[#999999] font-medium">
            Menu
          </span>
          <div className="w-6 h-px bg-black" />
        </div>

        {/* Menu Navigation Links */}
        <div className="flex flex-col gap-4 font-mono">
          {[
            { id: 'wiki', label: 'Wiki', desc: 'Curated Archive' },
            { id: 'blog', label: 'Blog', desc: 'Thoughts & Essays' },
            { id: 'about', label: 'About', desc: 'Site Info' },
          ].map((item) => {
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectMenu(item.id as any)}
                className={`group text-left flex flex-col transition-all ${
                  isActive ? 'text-black' : 'text-[#888888] hover:text-black'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-base lg:text-lg tracking-[-0.03em] ${isActive ? 'font-black underline underline-offset-4 decoration-2' : 'font-normal'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-black" />
                  )}
                </div>
                <span className="text-[10px] text-[#aaaaaa] group-hover:text-[#666666] tracking-wider uppercase">
                  {item.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Year / Mode */}
      <div className="flex flex-col gap-1 font-mono text-[10px] text-[#999999] uppercase tracking-wider">
        <span>Seoul / 2026</span>
        <span>Antigravity</span>
      </div>
    </nav>
  );
};

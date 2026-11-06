export type AppMenu = 'wiki' | 'blog' | 'magazine' | 'about';

interface MenuNavProps {
  activeMenu: AppMenu;
  onSelectMenu: (menu: AppMenu) => void;
  isCompact?: boolean;
}

export const MenuNav: React.FC<MenuNavProps> = ({ activeMenu, onSelectMenu, isCompact = false }) => {
  return (
    <nav
      className={`h-full flex flex-col justify-between py-8 border-l border-[#eeeeee] bg-white select-none transition-all duration-300 ${
        isCompact ? 'w-[72px] px-3 items-center shrink-0' : 'w-[180px] lg:w-[220px] px-6'
      }`}
    >
      <div className={`flex flex-col gap-8 ${isCompact ? 'items-center' : ''}`}>
        {/* Menu Section Header */}
        <div className={`flex flex-col gap-1 ${isCompact ? 'items-center' : ''}`}>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#999999] font-medium">
            {isCompact ? 'M' : 'Menu'}
          </span>
          <div className="w-5 h-px bg-black" />
        </div>

        {/* Menu Navigation Links */}
        <div className={`flex flex-col gap-4 font-mono ${isCompact ? 'items-center' : ''}`}>
          {[
            { id: 'wiki', label: 'Wiki', short: 'W', desc: 'Archive' },
            { id: 'blog', label: 'Blog', short: 'B', desc: 'Essays' },
            { id: 'magazine', label: 'Magazine', short: 'M', desc: 'Curations' },
            { id: 'about', label: 'About', short: 'A', desc: 'Info' },
          ].map((item) => {
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectMenu(item.id as AppMenu)}
                title={item.label}
                className={`group flex flex-col transition-all ${
                  isCompact ? 'items-center p-2' : 'text-left'
                } ${isActive ? 'text-black font-bold' : 'text-[#888888] hover:text-black'}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`tracking-[-0.03em] ${isCompact ? 'text-sm font-bold' : 'text-base lg:text-lg'} ${isActive && !isCompact ? 'font-black underline underline-offset-4 decoration-2' : ''}`}>
                    {isCompact ? item.short : item.label}
                  </span>
                  {isActive && isCompact && (
                    <span className="w-1.5 h-1.5 rounded-full bg-black" />
                  )}
                </div>
                {!isCompact && (
                  <span className="text-[10px] text-[#aaaaaa] group-hover:text-[#666666] tracking-wider uppercase">
                    {item.desc}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Year / Mode */}
      <div className={`font-mono text-[9px] text-[#999999] uppercase tracking-wider ${isCompact ? 'text-center' : ''}`}>
        {isCompact ? 'XP' : 'Seoul / 2026'}
      </div>
    </nav>
  );
};

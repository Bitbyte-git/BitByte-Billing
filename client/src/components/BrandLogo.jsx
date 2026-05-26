import { useMemo, useState } from 'react';
import { COMPANY_NAME, COMPANY_TAGLINE, LOGO_SOURCES } from '../config/brand.js';

const sizeMap = {
  sm: { box: 'h-9 w-9', img: 'h-9 w-9', title: 'text-sm', tag: 'text-[10px]' },
  md: { box: 'h-11 w-11', img: 'h-11 w-11', title: 'text-sm', tag: 'text-xs' },
  lg: { box: 'h-14 w-14', img: 'h-14 w-14', title: 'text-lg', tag: 'text-xs' },
  xl: { box: 'h-16 w-16', img: 'h-16 w-16', title: 'text-xl', tag: 'text-sm' }
};

export default function BrandLogo({
  size = 'md',
  showName = true,
  tagline = COMPANY_TAGLINE,
  theme = 'dark',
  className = ''
}) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const tokens = sizeMap[size] || sizeMap.md;
  const logoSrc = LOGO_SOURCES[sourceIndex];
  const failed = sourceIndex >= LOGO_SOURCES.length;

  const textClass = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const tagClass = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

  const onError = () => {
    setSourceIndex((current) => current + 1);
  };

  const mark = useMemo(() => {
    if (failed) {
      return (
        <div className={`${tokens.box} grid place-items-center rounded-xl bg-gradient-to-br from-purple to-violet text-xs font-black text-white`}>
          BB
        </div>
      );
    }
    return (
      <img
        src={logoSrc}
        alt={`${COMPANY_NAME} logo`}
        className={`${tokens.img} shrink-0 rounded-xl object-contain`}
        onError={onError}
      />
    );
  }, [failed, logoSrc, tokens.box, tokens.img]);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {mark}
      {showName && (
        <div className="min-w-0">
          <p className={`${tokens.title} font-extrabold leading-tight ${textClass}`}>{COMPANY_NAME}</p>
          {tagline && <p className={`${tokens.tag} font-medium ${tagClass}`}>{tagline}</p>}
        </div>
      )}
    </div>
  );
}

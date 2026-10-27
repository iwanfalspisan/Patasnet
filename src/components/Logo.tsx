import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  inverse?: boolean;
  companyName?: string;
  logoUrl?: string;
  tagline?: string;
}

export default function Logo({ className = '', iconOnly = false, inverse = false, companyName, logoUrl, tagline }: LogoProps) {
  const [imageError, setImageError] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState<string>(logoUrl && logoUrl.trim() !== '' ? logoUrl : '/logo-patasnet.png');

  // Reset or update source when logoUrl changes
  React.useEffect(() => {
    setImageError(false);
    setCurrentSrc(logoUrl && logoUrl.trim() !== '' ? logoUrl : '/logo-patasnet.png');
  }, [logoUrl]);

  const handleImageError = () => {
    if (currentSrc !== '/logo-patasnet.png') {
      // Fallback to built-in logo asset
      setCurrentSrc('/logo-patasnet.png');
    } else {
      // If even default asset fails, show SVG
      setImageError(true);
    }
  };

  const hasValidLogoImage = Boolean(!imageError && currentSrc);

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Visual Icon Logo: Custom Uploaded Logo or Intersecting high-speed fiber waves */}
      <div className="relative flex items-center justify-center shrink-0">
        {hasValidLogoImage ? (
          <img
            src={currentSrc}
            alt={companyName || 'Logo'}
            onError={handleImageError}
            className="w-[42px] h-[42px] object-contain rounded-xl border border-slate-200/50 bg-white p-0.5 shadow-sm transition-transform duration-300 hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg
            width="42"
            height="42"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="filter drop-shadow-[0_4px_10px_rgba(37,99,235,0.25)] transition-transform duration-300 hover:scale-105"
          >
            {/* Outer speed rings */}
            <circle cx="50" cy="50" r="44" stroke="url(#ring-grad)" strokeWidth="1.5" strokeDasharray="6 4" className="opacity-40" />
            
            {/* Futuristic geometric nodes */}
            <path
              d="M50 12 C62 12, 74 16, 80 26 C86 36, 88 50, 80 64 C72 78, 50 88, 50 88"
              stroke="url(#speed-grad-1)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="opacity-75"
            />
            <path
              d="M50 12 C38 12, 26 16, 20 26 C14 36, 12 50, 20 64 C28 78, 50 88, 50 88"
              stroke="url(#speed-grad-2)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="opacity-75"
            />

            {/* Central High-Speed Fiber Mesh Core */}
            <path
              d="M34 28 V72 M34 28 H58 C66 28 68 46 58 46 H34"
              stroke={inverse ? '#facc15' : '#1d4ed8'}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            <path
              d="M36 30 V70 M36 30 H56 C64 30 66 44 56 44 H36"
              stroke="url(#core-grad)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Fiber Optic Pulse Node */}
            <circle cx="58" cy="45" r="4.5" fill="#ffffff" />
            <circle cx="58" cy="45" r="8" stroke="#38bdf8" strokeWidth="2" className="animate-ping" />

            <defs>
              <linearGradient id="ring-grad" x1="0" y1="0" x2="100" y2="100">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="speed-grad-1" x1="12" y1="12" x2="88" y2="88">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
              <linearGradient id="speed-grad-2" x1="88" y1="12" x2="12" y2="88">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="core-grad" x1="50" y1="20" x2="50" y2="75">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
        )}
        
        {/* Glow backdrop element */}
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl -z-10 animate-pulse" />
      </div>

      {!iconOnly && (
        <div className="flex flex-col items-start leading-none min-w-0">
          <div className="flex items-baseline max-w-full">
            <span className={`font-display font-black text-xl sm:text-2xl tracking-tight truncate ${inverse ? 'text-white' : 'text-slate-900'}`}>
              {(() => {
                const name = (companyName || 'PATAS NET').trim().toUpperCase();
                if (name.includes(' ')) {
                  const parts = name.split(' ');
                  const first = parts[0];
                  const rest = parts.slice(1).join(' ');
                  return (
                    <>
                      {first}
                      <span className={inverse ? 'text-yellow-400' : 'text-blue-600'}> {rest}</span>
                    </>
                  );
                } else {
                  const half = Math.ceil(name.length / 2);
                  const part1 = name.slice(0, half);
                  const part2 = name.slice(half);
                  return (
                    <>
                      {part1}
                      <span className={inverse ? 'text-yellow-400' : 'text-blue-600'}>{part2}</span>
                    </>
                  );
                }
              })()}
            </span>
          </div>
          <span className={`text-[9px] font-mono tracking-[0.18em] uppercase font-extrabold mt-1 truncate max-w-full ${inverse ? 'text-slate-300' : 'text-slate-500'}`}>
            {(tagline || 'Internet Fiber Optic').toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

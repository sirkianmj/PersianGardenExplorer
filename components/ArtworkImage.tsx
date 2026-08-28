import React, { useState } from 'react';

interface ArtworkImageProps {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  title?: string;
  artist?: string;
  period?: string;
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  src,
  fallbackSrc,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'relative w-full h-full bg-[#0d1117] overflow-hidden',
  title,
  artist,
  period,
}) => {
  const [currentSrcIndex, setCurrentSrcIndex] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Array of possible candidate URLs
  const candidateUrls = [src, fallbackSrc].filter((u): u is string => Boolean(u && u.trim().length > 0));

  const currentUrl = candidateUrls[currentSrcIndex] || '';

  const handleError = () => {
    if (currentSrcIndex + 1 < candidateUrls.length) {
      setCurrentSrcIndex(prev => prev + 1);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  return (
    <div className={containerClassName}>
      {/* Shimmer Skeleton Placeholder while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-gold-primary/30 border-t-gold-primary animate-spin" />
        </div>
      )}

      {/* Fallback Beautiful Persian Art Tile if image fails completely */}
      {hasError || !currentUrl ? (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1c1917] via-[#151a21] to-[#0f172a] p-4 flex flex-col justify-between items-center text-center border border-gold-primary/20">
          <div className="w-10 h-10 rounded-full bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary text-lg shadow-inner">
            🌸
          </div>
          <div className="my-auto px-2">
            <p className="text-[12px] font-bold text-gold-primary font-nastaliq line-clamp-2 leading-relaxed">
              {title || alt || 'نگاره تاریخی پردیس'}
            </p>
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
              {artist || 'هنرمند ایرانی'}
            </p>
          </div>
          <div className="text-[9px] px-2 py-0.5 rounded bg-black/40 text-gold-primary/80 border border-gold-primary/20">
            {period || 'مکتب نگارگری کهن'}
          </div>
        </div>
      ) : (
        <img
          src={currentUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          className={`${className} transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
};

export default ArtworkImage;

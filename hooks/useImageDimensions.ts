import { useState, useEffect } from 'react';

export const useImageDimensions = (url: string, initialWidth?: number, initialHeight?: number) => {
  const [size, setSize] = useState({ 
    width: initialWidth || 1024, 
    height: initialHeight || 1024 
  });

  useEffect(() => {
    if (initialWidth && initialHeight) return;

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [url, initialWidth, initialHeight]);

  return size;
};

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Photo } from '../types';

interface LightboxProps {
  photo: Photo | null;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ photo, onClose }) => {
  useEffect(() => {
    if (photo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [photo]);

  if (!photo) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50 border border-white/10"
      >
        <X size={24} />
      </button>

      <div 
        className="relative max-w-full max-h-full flex flex-col items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <img 
          src={photo.url} 
          alt={photo.title || "Preview"} 
          className="max-w-full max-h-[80vh] object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg" 
        />
        
        <div className="mt-4 w-full max-w-md bg-slate-900/80 backdrop-blur-sm p-4 rounded-xl border border-white/10">
            {photo.title && <h3 className="text-white text-lg font-bold font-display tracking-wide mb-1">{photo.title}</h3>}
            <div className="flex justify-between items-end">
                <p className="text-slate-300 text-sm">
                    <span className="text-slate-500 text-xs block mb-0.5">UPLOADER</span>
                    {photo.uploaderName}
                </p>
                <p className="text-poke-cyan text-xs font-mono">
                    {new Date(photo.timestamp).toLocaleString()}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Lightbox;

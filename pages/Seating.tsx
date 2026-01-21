
import React, { useState, useEffect } from 'react';
import { SEATING_CHART_URL as DEFAULT_URL } from '../constants';
import { ZoomIn, X, MapPin, Scan, Upload, Loader2 } from 'lucide-react';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/imageService';
import { useAuth } from '../context/AuthContext';

const Seating: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chartUrl, setChartUrl] = useState(DEFAULT_URL);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = DataService.subscribeToSeating((url) => {
        setChartUrl(url);
    });
    return () => unsub();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      const file = e.target.files[0];
      setUploading(true);
      try {
          const compressed = await compressImage(file);
          await DataService.uploadSeatingChart(compressed);
      } catch (e) {
          console.error(e);
          alert("上傳失敗");
      } finally {
          setUploading(false);
      }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-display font-bold text-amber-400 text-glow-yellow">我要坐哪</h2>
            <p className="text-slate-400 text-xs font-mono">春酒座位查詢</p>
        </div>
        <div className="w-10 h-10 rounded-full border border-amber-500/30 flex items-center justify-center bg-amber-500/10 animate-pulse">
            <MapPin className="text-amber-400" size={20} />
        </div>
      </div>

      <div 
        className="relative w-full aspect-video bg-slate-900 rounded-xl border border-amber-500/30 overflow-hidden cursor-zoom-in group shadow-[0_0_20px_rgba(245,158,11,0.1)]"
        onClick={() => setIsOpen(true)}
      >
        <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(rgba(245,158,11,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-amber-500 z-10"></div>
        <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-amber-500 z-10"></div>
        <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-amber-500 z-10"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-amber-500 z-10"></div>

        <img src={chartUrl} alt="Seating Chart" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all group-hover:scale-105 duration-500" />
        
        <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/70 backdrop-blur text-amber-400 px-4 py-2 rounded border border-amber-500/50 flex items-center gap-2">
                <Scan size={16} />
                <span className="font-mono text-xs font-bold">查看詳情</span>
            </div>
        </div>
      </div>

      <div className="bg-amber-900/10 border border-amber-500/20 text-amber-200/80 p-4 rounded-xl text-sm w-full font-mono relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
        <p className="font-bold mb-1 text-amber-400">:: 注意事項 ::</p>
        <p className="text-xs leading-relaxed opacity-80">
          舞台位置在上方；請按照座位表之標示入座
        </p>
      </div>

      {user?.isAdmin && (
          <div className="border border-dashed border-slate-700 p-4 rounded-xl text-center">
              <label className="cursor-pointer block">
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept="image/*" />
                  <div className="flex flex-col items-center gap-2 text-slate-500 hover:text-white transition-colors">
                      {uploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                      <span className="text-xs">更新座位圖 (Admin Only)</span>
                  </div>
              </label>
          </div>
      )}

      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/98 flex flex-col items-center justify-center p-0 backdrop-blur-xl"
          onClick={() => setIsOpen(false)}
        >
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-end items-center z-50">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors border border-white/20"
                >
                    <X size={24} />
                </button>
            </div>
            
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                <img src={chartUrl} alt="Seating Chart Full" className="max-w-none h-auto min-w-full shadow-2xl" />
            </div>
        </div>
      )}
    </div>
  );
};

export default Seating;

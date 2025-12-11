
import React, { useEffect, useState } from 'react';
import { Photo } from '../types';
import * as DataService from '../services/dataService';
import { compressImage } from '../services/utils';
import Button from '../components/Button';
import { Upload, Trash2, Heart, Loader2, Lock, Camera, XCircle, SortAsc, Clock } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

const DressCode: React.FC = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'id'>('time');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribePhotos = DataService.subscribeToPhotos(
        'dresscode', 
        (data) => {
            setPhotos(data);
            setLoading(false);
        },
        (error) => {
            console.error(error);
            setLoading(false);
        }
    );

    return () => {
        unsubscribePhotos();
    };
  }, []);

  const sortedPhotos = [...photos].sort((a, b) => {
      if (sortBy === 'time') {
          return b.timestamp - a.timestamp; 
      } else {
          return a.uploaderId.localeCompare(b.uploaderId);
      }
  });

  const toggleUpload = () => {
      if (!user) {
          setShowLoginModal(true);
      } else {
          setShowUpload(!showUpload);
      }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.getElementById('dresscode-upload') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0 || !user) return;
    
    const originalFile = fileInput.files[0];
    setUploading(true);

    try {
        const compressedFile = await compressImage(originalFile, 1);
        
        if (compressedFile.size > 1024 * 1024) {
            alert("圖片壓縮後仍超過 1MB，請選擇更小的檔案。");
            setUploading(false);
            return;
        }

        await DataService.uploadPhoto(compressedFile, 'dresscode', user, title);
        setTitle('');
        setShowUpload(false);
        fileInput.value = '';
    } catch (error) {
        console.error(error);
        alert("上傳失敗：可能是壓縮錯誤或網路問題");
    } finally {
        setUploading(false);
    }
  };

  const handleVote = async (photoId: string) => {
    if (!user) {
        setShowLoginModal(true);
        return;
    }
    
    try {
        await DataService.voteForPhoto(photoId, user.id);
    } catch (e) {
        alert("投票失敗，請重試");
    }
  };

  const handleDelete = async (photo: Photo) => {
    if(!user) return;
    if(!confirm("確認刪除：確定要移除這張照片嗎？此動作無法復原。")) return;
    
    setDeletingId(photo.id);
    try {
        await DataService.deletePhoto(photo);
    } catch (e) {
        alert("權限不足或刪除失敗");
    } finally {
        setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden space-y-4">
        <div className="flex justify-between items-start relative z-10">
            <div>
                <h2 className="text-2xl font-display font-bold text-white text-glow">就決定是你了</h2>
                <p className="text-poke-cyan/70 text-xs mt-1 font-mono tracking-wider">最強寶可夢dress code大賽</p>
            </div>
            
            <Button 
                variant={showUpload ? 'secondary' : 'primary'} 
                className="text-xs py-2 px-4"
                onClick={toggleUpload}
            >
                {showUpload ? <XCircle className="w-4 h-4" /> : (user ? <Camera className="w-4 h-4" /> : <Lock className="w-4 h-4" />)}
                {showUpload ? '取消' : (user ? '上傳' : '登入上傳')}
            </Button>
        </div>

        {showUpload && user && (
            <form onSubmit={handleUpload} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 animate-fade-in space-y-3">
                <input 
                    type="text" 
                    placeholder="輸入穿搭主題/標題..." 
                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-poke-cyan outline-none"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={20}
                    required
                />
                <div className="relative border-2 border-dashed border-slate-600 rounded-xl p-4 text-center hover:bg-slate-800/50 transition-colors">
                    <input
                        id="dresscode-upload"
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required
                    />
                    <div className="pointer-events-none flex flex-col items-center gap-1 text-slate-400">
                        <Upload size={20} />
                        <span className="text-xs">點擊選擇照片 (自動壓縮至1MB內)</span>
                    </div>
                </div>
                <Button fullWidth type="submit" disabled={uploading}>
                    {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : '開始上傳'}
                </Button>
            </form>
        )}
        
        <div className="flex justify-end border-t border-white/5 pt-2">
            <div className="flex bg-slate-900/80 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setSortBy('time')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold transition-colors ${sortBy === 'time' ? 'bg-poke-cyan text-black' : 'text-slate-400 hover:text-white'}`}
                >
                    <Clock size={12} /> 最新
                </button>
                <button 
                    onClick={() => setSortBy('id')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold transition-colors ${sortBy === 'id' ? 'bg-poke-cyan text-black' : 'text-slate-400 hover:text-white'}`}
                >
                    <SortAsc size={12} /> 員編
                </button>
            </div>
        </div>

        <div className="absolute right-0 top-0 w-20 h-20 bg-poke-red/20 blur-2xl rounded-full pointer-events-none"></div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-poke-cyan/50">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <span className="font-mono text-xs animate-pulse">連線資料庫中...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {sortedPhotos.map(photo => {
                const isVoted = user?.votedFor === photo.id;
                const isOwner = user?.id === photo.uploaderId || user?.isAdmin;
                const isThisDeleting = deletingId === photo.id;

                return (
                    <div key={photo.id} className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 group ${isVoted ? 'border-poke-red shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'hover:border-slate-500'}`}>
                        <div className="aspect-[4/5] bg-black relative">
                            <img src={photo.url} alt={photo.title || "Dress code"} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>

                            {isOwner && (
                                <button 
                                    onClick={() => handleDelete(photo)}
                                    disabled={isThisDeleting}
                                    className="absolute top-3 right-3 bg-red-600/80 backdrop-blur-md p-2 rounded-lg text-white hover:bg-red-500 transition-all border border-red-400/30 z-20 shadow-lg"
                                >
                                    {isThisDeleting ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16} />}
                                </button>
                            )}
                            
                            {isVoted && (
                                <div className="absolute top-3 left-3 bg-poke-red/90 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded border border-red-400 shadow-lg flex items-center gap-1">
                                    <Heart size={10} fill="currentColor" /> 已選定
                                </div>
                            )}

                            <div className="absolute bottom-3 right-3 text-right">
                                <span className={`block text-3xl font-display font-bold leading-none ${isVoted ? 'text-poke-red text-glow' : 'text-white'}`}>{photo.likes}</span>
                                <span className="text-[10px] text-gray-400 font-mono">票數</span>
                            </div>

                            <div className="absolute bottom-3 left-3 max-w-[70%]">
                                {photo.title && <p className="font-bold text-white text-md truncate text-glow mb-0.5">{photo.title}</p>}
                                <p className="text-xs text-gray-300 truncate">{photo.uploaderName}</p>
                                <p className="text-[10px] text-poke-cyan font-mono">ID: {photo.uploaderId}</p>
                            </div>
                        </div>
                        
                        <div className="p-3 border-t border-white/5 bg-white/5">
                            <Button 
                                variant={isVoted ? "danger" : "secondary"} 
                                fullWidth 
                                className={`text-sm py-2 ${isVoted ? '' : 'hover:bg-poke-red/10 hover:text-poke-red hover:border-poke-red/50'}`}
                                onClick={() => handleVote(photo.id)}
                            >
                                {isVoted ? <XCircle className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                                {isVoted ? '取消投票' : '投給他'}
                            </Button>
                        </div>
                    </div>
                );
            })}
            
            {photos.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 border border-dashed border-slate-700 rounded-2xl bg-slate-900/50">
                    <Camera className="w-12 h-12 text-slate-700 mb-2" />
                    <p className="text-slate-500 font-mono text-sm">目前無人上傳，成為第一個吧！</p>
                </div>
            )}
        </div>
      )}

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => setShowUpload(true)} />
      )}
    </div>
  );
};

export default DressCode;

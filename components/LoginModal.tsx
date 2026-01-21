
import React, { useState } from 'react';
import Button from './Button';
import { LogOut, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  // 處理輸入變更：僅允許數字，且長度上限為 5
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // 過濾非數字
    if (value.length <= 5) {
      setEmployeeId(value);
      setError(null); // 輸入時清除錯誤訊息
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 嚴格校驗：必須為五位數字
    if (!/^\d{5}$/.test(employeeId)) {
      setError("員編必須為精確的五位數字");
      return;
    }
    
    setIsProcessing(true);
    try {
        await login(employeeId);
        onLoginSuccess();
        onClose();
    } catch (error) {
        console.error(error);
        setError("登入失敗，請確認網路狀態");
    } finally {
        setIsProcessing(false);
    }
  };

  const isValidLength = employeeId.length === 5;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-poke-cyan/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] relative overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-transparent via-poke-cyan to-transparent"></div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <LogOut size={20} className="rotate-180"/>
        </button>

        <div className="p-6">
            <div className="text-center mb-6">
                <h3 className="text-xl font-display font-bold text-white tracking-wide">訓練家登入</h3>
                <p className="text-poke-cyan/60 text-[10px] font-mono mt-1 uppercase tracking-widest">Authentication Required</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="relative">
                    <div className="text-[10px] text-slate-500 font-mono mb-2 flex justify-between uppercase">
                        <span>Staff ID</span>
                        <span className={isValidLength ? 'text-poke-cyan' : 'text-slate-700'}>
                            {employeeId.length} / 5 Digits
                        </span>
                    </div>
                    <input 
                        type="text" 
                        inputMode="numeric" 
                        pattern="[0-9]*"
                        className={`w-full bg-black/30 text-center text-3xl font-display py-4 border-b-2 outline-none transition-all placeholder:text-slate-800 tracking-widest ${
                            error ? 'border-poke-red text-poke-red' : (isValidLength ? 'border-poke-cyan text-white' : 'border-slate-700 text-slate-400')
                        }`}
                        placeholder="00000"
                        autoFocus
                        value={employeeId}
                        onChange={handleInputChange}
                        disabled={isProcessing}
                    />
                    
                    {error && (
                        <div className="mt-3 flex items-center gap-1.5 text-poke-red text-[11px] font-medium animate-shake">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <Button 
                        fullWidth 
                        type="submit" 
                        disabled={isProcessing || !isValidLength} 
                        className={`shadow-lg transition-all ${isValidLength ? 'shadow-poke-cyan/20' : 'opacity-50 grayscale'}`}
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : '登入系統'}
                    </Button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

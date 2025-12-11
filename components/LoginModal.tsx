
import React, { useState } from 'react';
import Button from './Button';
import { User as UserIcon, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim()) return;
    
    setIsProcessing(true);
    try {
        await login(employeeId);
        onLoginSuccess();
        onClose();
    } catch (error) {
        console.error(error);
        alert("登入失敗，請檢查網路連線");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-poke-cyan/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] relative overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-transparent via-poke-cyan to-transparent"></div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <LogOut size={20} className="rotate-180"/>
        </button>

        <div className="p-8">
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 border-2 border-poke-cyan rounded-full animate-ping opacity-20"></div>
                    <div className="relative bg-slate-800 rounded-full w-full h-full flex items-center justify-center border border-poke-cyan">
                        <UserIcon className="text-poke-cyan" />
                    </div>
                </div>
                <h3 className="text-2xl font-display font-bold text-white tracking-wide">身分驗證</h3>
                <p className="text-poke-cyan/60 text-xs font-mono mt-1">請輸入員編以解鎖功能</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="relative">
                    <input 
                        type="text" 
                        className="w-full bg-black/30 text-center text-xl font-display text-white py-4 border-b-2 border-slate-700 focus:border-poke-cyan outline-none transition-colors placeholder:text-slate-700"
                        placeholder="12345"
                        autoFocus
                        value={employeeId}
                        onChange={e => setEmployeeId(e.target.value)}
                        disabled={isProcessing}
                    />
                </div>
                <Button fullWidth type="submit" disabled={isProcessing} className="shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    {isProcessing ? <Loader2 className="animate-spin" /> : '進入系統'}
                </Button>
            </form>
        </div>
        
        <div className="absolute bottom-2 left-4 text-[10px] text-slate-700 font-mono">SECURE CONNECTION</div>
      </div>
    </div>
  );
};

export default LoginModal;

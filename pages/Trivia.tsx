
/**
 * 對戰競技場：快問快答遊戲
 */
import React, { useState, useEffect } from 'react';
import { TriviaGameState, TriviaQuestion } from '../types';
import * as DataService from '../services/dataService';
import Button from '../components/Button';
import { Clock, Trophy, CheckCircle, XCircle, Settings, ChevronRight, Edit, Save, Lock, Send } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

const Trivia: React.FC = () => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<TriviaGameState>({ status: 'LOBBY', currentQuestionIndex: -1, answers: {} });
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 1. 同步遊戲狀態與題目
  useEffect(() => {
    const unsubState = DataService.subscribeToTriviaState((state) => {
      setGameState(state);
      // 當題目更新時，重置本地作答狀態
      if (state.status === 'QUESTION') {
        setSelectedOption(null);
        setIsAnswerSubmitted(false);
      }
    });
    const unsubQuestions = DataService.subscribeToQuestions(setQuestions);
    return () => { unsubState(); unsubQuestions(); };
  }, []);

  // 2. 倒數計時邏輯 (僅在題目進行中啟動)
  useEffect(() => {
    let interval: any;
    if (gameState.status === 'QUESTION' && gameState.questionStartTime) {
      const q = questions[gameState.currentQuestionIndex];
      interval = setInterval(() => {
        const elapsed = (Date.now() - gameState.questionStartTime!) / 1000;
        const remaining = Math.max(0, Math.ceil(q.timeLimit - elapsed));
        setTimeLeft(remaining);
      }, 200);
    }
    return () => clearInterval(interval);
  }, [gameState, questions]);

  // 3. 管理員控制功能
  const nextStep = () => {
    if (gameState.status === 'LOBBY' || gameState.status === 'REVEAL' || gameState.status === 'LEADERBOARD') {
      const nextIdx = gameState.currentQuestionIndex + 1;
      if (nextIdx < questions.length) {
        DataService.updateTriviaState({ status: 'QUESTION', currentQuestionIndex: nextIdx, questionStartTime: Date.now() });
      } else {
        DataService.updateTriviaState({ status: 'ENDED' });
      }
    }
  };

  // 4. 提交答案邏輯
  const handleSubmitAnswer = async () => {
    if (gameState.status !== 'QUESTION' || selectedOption === null || !user) return;
    
    setIsAnswerSubmitted(true);
    const q = questions[gameState.currentQuestionIndex];
    const isCorrect = selectedOption === q.correctAnswer;
    
    // 計分公式：答對基礎 500 分 + 剩餘時間獎勵
    const timeRatio = timeLeft / q.timeLimit;
    const points = isCorrect ? Math.round(500 + (500 * timeRatio)) : 0;
    
    await DataService.submitAnswer(user.id, selectedOption, q.timeLimit - timeLeft, points);
  };

  const currentQ = questions[gameState.currentQuestionIndex];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* 管理員控制台 (只有管理員看得到) */}
      {user?.isAdmin && (
        <div className="bg-slate-900 border border-purple-500/50 p-2 rounded-xl mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2 px-2 text-purple-400 font-bold text-xs"><Settings size={14}/> GM CONTROL</div>
          <div className="flex gap-2">
            {gameState.status === 'QUESTION' ? (
              <Button className="text-[10px] py-1 h-8" onClick={() => DataService.updateTriviaState({ status: 'REVEAL' })}>停止作答</Button>
            ) : (
              <Button className="text-[10px] py-1 h-8 bg-purple-600 border-none" onClick={nextStep}>
                {gameState.status === 'LOBBY' ? '開始遊戲' : '下一題'}
              </Button>
            )}
            <Button variant="ghost" className="text-[10px] py-1 h-8" onClick={() => DataService.updateTriviaState({ status: 'LEADERBOARD' })}>排行</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto relative">
        {!user && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-50">
            <Lock size={48} className="text-slate-600 mb-4" />
            <Button onClick={() => setShowLoginModal(true)}>請先登入參加對戰</Button>
          </div>
        )}

        {/* 遊戲大廳階段 */}
        {gameState.status === 'LOBBY' && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-float">
            <Trophy size={80} className="text-poke-cyan mb-6" />
            <h2 className="text-4xl font-display font-bold text-white text-glow">對戰競技場</h2>
            <p className="text-slate-400 mt-4 font-mono">等待主持人開始遊戲...</p>
          </div>
        )}

        {/* 作答與揭曉階段 */}
        {(gameState.status === 'QUESTION' || gameState.status === 'REVEAL') && currentQ && (
          <div className="space-y-6 pt-4 pb-20">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-slate-500">第 {gameState.currentQuestionIndex + 1} 題</span>
              <div className="flex items-center gap-2 font-mono font-bold text-2xl">
                <Clock className={timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-poke-cyan'} />
                <span className={timeLeft < 5 ? 'text-red-500' : 'text-white'}>{timeLeft}s</span>
              </div>
            </div>
            
            <div className="bg-slate-900/80 p-8 rounded-2xl border border-poke-cyan/30 text-center shadow-lg">
              <h3 className="text-2xl font-bold text-white leading-relaxed">{currentQ.question}</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {currentQ.options.map((opt, idx) => {
                const isRevealed = gameState.status === 'REVEAL';
                const isCorrect = idx === currentQ.correctAnswer;
                const isSelected = selectedOption === idx;
                
                let btnClass = "bg-slate-900/50 border-slate-700 text-slate-300";
                if (isRevealed) {
                  if (isCorrect) btnClass = "bg-green-500/20 border-green-500 text-green-400 shadow-glow";
                  else if (isSelected) btnClass = "bg-red-500/20 border-red-500 text-red-400";
                  else btnClass = "opacity-30 grayscale";
                } else if (isSelected) {
                  btnClass = "bg-poke-cyan/20 border-poke-cyan text-poke-cyan shadow-glow";
                }

                return (
                  <button 
                    key={idx}
                    disabled={isRevealed || isAnswerSubmitted}
                    onClick={() => setSelectedOption(idx)}
                    className={`p-5 rounded-xl font-bold text-lg text-left transition-all border-2 ${btnClass}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {gameState.status === 'QUESTION' && !isAnswerSubmitted && selectedOption !== null && (
              <Button onClick={handleSubmitAnswer} fullWidth className="animate-bounce shadow-2xl py-4 text-xl">
                <Send size={20} /> 發送答案
              </Button>
            )}
          </div>
        )}

        {/* 排行榜階段 */}
        {gameState.status === 'LEADERBOARD' && (
           <div className="space-y-6">
              <h2 className="text-3xl font-display font-bold text-center text-poke-yellow text-glow">領先訓練家</h2>
              <div className="bg-slate-900/80 border border-slate-700 rounded-2xl overflow-hidden">
                {Object.entries(gameState.answers)
                  .sort(([, a], [, b]) => b.score - a.score)
                  .slice(0, 10)
                  .map(([uid, data], idx) => (
                    <div key={uid} className="flex items-center p-4 border-b border-slate-800">
                      <div className="w-8 h-8 flex items-center justify-center font-bold text-poke-cyan mr-4">{idx + 1}</div>
                      <div className="flex-1 font-bold text-white">{uid}</div>
                      <div className="font-mono text-emerald-400 font-bold">{data.score} PT</div>
                    </div>
                  ))}
              </div>
           </div>
        )}
      </div>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />}
    </div>
  );
};

export default Trivia;

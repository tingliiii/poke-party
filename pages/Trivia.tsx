
import React, { useState, useEffect } from 'react';
import { User, TriviaGameState, TriviaQuestion } from '../types';
import * as DataService from '../services/dataService';
import Button from '../components/Button';
import { Clock, Trophy, CheckCircle, XCircle, Settings, ChevronRight, Edit, Save, Lock, Send } from 'lucide-react';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

const Trivia: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [gameState, setGameState] = useState<TriviaGameState>({ status: 'LOBBY', currentQuestionIndex: -1, answers: {} });
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<TriviaQuestion>>({
      question: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 15
  });

  useEffect(() => {
    setIsAdmin(!!user?.isAdmin);
  }, [user]);

  useEffect(() => {
    const unsubState = DataService.subscribeToTriviaState(
        (state) => {
            setGameState(state);
            // Reset local selection state if new question starts
            if (state.status === 'QUESTION' && state.currentQuestionIndex !== gameState.currentQuestionIndex) {
                 setSelectedOption(null);
                 setIsAnswerSubmitted(false);
            }
        }, 
        (err) => console.error("Trivia state error", err)
    );

    const unsubQuestions = DataService.subscribeToQuestions(
        (qs) => {
            setQuestions(qs);
        },
        (err) => console.error("Trivia questions error", err)
    );

    return () => {
        unsubState();
        unsubQuestions();
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (gameState.status === 'QUESTION' && gameState.questionStartTime) {
        const q = questions[gameState.currentQuestionIndex];
        if (q) {
             interval = setInterval(() => {
                const elapsed = (Date.now() - gameState.questionStartTime!) / 1000;
                const remaining = Math.max(0, Math.ceil(q.timeLimit - elapsed));
                setTimeLeft(remaining);
            }, 200);
        }
    }
    return () => clearInterval(interval);
  }, [gameState, questions]);

  const adminStartGame = () => DataService.updateTriviaState({ status: 'LOBBY', currentQuestionIndex: -1, answers: {} });
  
  const adminNextQuestion = () => {
    const nextIdx = gameState.currentQuestionIndex + 1;
    if (nextIdx < questions.length) {
        DataService.updateTriviaState({ status: 'QUESTION', currentQuestionIndex: nextIdx, questionStartTime: Date.now() });
    } else {
        DataService.updateTriviaState({ status: 'ENDED' });
    }
  };
  
  const adminRevealAnswer = () => DataService.updateTriviaState({ status: 'REVEAL' });
  const adminShowLeaderboard = () => DataService.updateTriviaState({ status: 'LEADERBOARD' });
  
  const adminAddQuestion = async () => {
    if (!newQuestion.question) return;
    const q: TriviaQuestion = {
        id: Date.now().toString(),
        question: newQuestion.question!,
        options: newQuestion.options as string[],
        correctAnswer: newQuestion.correctAnswer || 0,
        timeLimit: newQuestion.timeLimit || 15
    };
    await DataService.addTriviaQuestion(q);
    setIsEditing(false);
    setNewQuestion({ question: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 15 });
  };

  const handleSelectOption = (idx: number) => {
    if (gameState.status !== 'QUESTION' || isAnswerSubmitted || !user) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = async () => {
    if (gameState.status !== 'QUESTION' || selectedOption === null || isAnswerSubmitted || !user) return;
    
    setIsAnswerSubmitted(true);
    
    const q = questions[gameState.currentQuestionIndex];
    // Calculate time taken: Total limit - Current Remaining
    // Ensure we don't have negative time if lag
    const timeTaken = Math.max(0, q.timeLimit - timeLeft);
    
    // Scoring Logic: 
    // Base 500 + Bonus based on speed. 
    // If correct, score > 0. If wrong, score 0.
    const isCorrect = selectedOption === q.correctAnswer;
    const ratio = Math.max(0, timeLeft) / q.timeLimit;
    const points = isCorrect ? Math.round(500 + (500 * ratio)) : 0;
    
    await DataService.submitAnswer(user.id, selectedOption, timeTaken, points);
  };

  const renderLeaderboard = () => {
    const scores: Record<string, number> = {};
    Object.entries(gameState.answers || {}).forEach(([uid, ans]) => {
        const val = ans as { score: number };
        scores[uid] = (scores[uid] || 0) + val.score;
    });
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a).slice(0, 10);

    return (
        <div className="space-y-6 animate-fade-in-up pb-20">
            <div className="text-center">
                <h2 className="text-3xl font-display font-bold text-poke-yellow text-glow-yellow">排行榜</h2>
                <div className="h-1 w-20 bg-poke-yellow mx-auto mt-2 rounded-full"></div>
            </div>
            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl overflow-hidden backdrop-blur-xl">
                {sorted.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">尚無得分紀錄</div>
                ) : (
                    sorted.map(([uid, score], idx) => (
                        <div key={uid} className={`flex items-center p-4 border-b border-slate-800 relative overflow-hidden ${uid === user?.id ? 'bg-poke-cyan/10' : ''}`}>
                            {idx === 0 && <div className="absolute inset-0 bg-yellow-500/10"></div>}
                            <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-display font-bold text-lg mr-4 border ${idx < 3 ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-slate-600 text-slate-500'}`}>
                                {idx + 1}
                            </div>
                            <div className="flex-1 relative z-10">
                                <p className={`font-bold ${uid === user?.id ? 'text-poke-cyan' : 'text-white'}`}>{uid === user?.id ? '你' : uid}</p>
                            </div>
                            <div className="font-mono font-bold text-xl text-emerald-400 relative z-10">{score}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
  };

  if (isEditing && isAdmin) {
      return (
          <div className="glass-panel p-6 rounded-2xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2"><Edit size={20} className="text-poke-cyan"/> 題目設定</h2>
                 <Button variant="ghost" className="text-xs" onClick={() => setIsEditing(false)}>取消</Button>
              </div>
              <div className="space-y-4">
                  <div>
                      <label className="text-xs text-slate-400 mb-1 block">題目內容</label>
                      <input className="w-full bg-slate-900 border border-slate-700 p-3 rounded text-white focus:border-poke-cyan outline-none" value={newQuestion.question} onChange={e => setNewQuestion({...newQuestion, question: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <label className="text-xs text-slate-400">選項 (點擊圓圈設定正確答案)</label>
                    {newQuestion.options?.map((opt, i) => (
                        <div key={i} className="flex gap-2 items-center group">
                            <div onClick={() => setNewQuestion({...newQuestion, correctAnswer: i})} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${newQuestion.correctAnswer === i ? 'border-green-500 bg-green-500/20' : 'border-slate-600 group-hover:border-slate-400'}`}>{newQuestion.correctAnswer === i && <div className="w-2 h-2 rounded-full bg-green-500"></div>}</div>
                            <input className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-white text-sm focus:border-poke-cyan outline-none" value={opt} onChange={e => { const newOpts = [...newQuestion.options!]; newOpts[i] = e.target.value; setNewQuestion({...newQuestion, options: newOpts}); }} />
                        </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4"><Button onClick={adminAddQuestion} className="gap-2"><Save size={16}/> 儲存並發布</Button></div>
              </div>
          </div>
      );
  }

  const currentQ = questions[gameState.currentQuestionIndex];
  
  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {isAdmin && (
        <div className="bg-slate-900 border border-purple-500/50 p-2 rounded-xl mb-4 flex flex-wrap gap-2 items-center justify-between shadow-[0_0_20px_rgba(168,85,247,0.2)]">
           <div className="flex items-center gap-2 px-2">
              <Settings size={16} className="text-purple-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">GM 控制台</span>
           </div>
           <div className="flex gap-2">
              {gameState.status === 'LOBBY' && (
                  <>
                    <Button variant="outline" className="text-[10px] py-1 h-8 border-purple-500/50 text-purple-300" onClick={() => setIsEditing(true)}>新增題目</Button>
                    <Button className="text-[10px] py-1 h-8 bg-purple-600 hover:bg-purple-500 border-none text-white" onClick={adminNextQuestion}>開始遊戲</Button>
                  </>
              )}
              {gameState.status === 'QUESTION' && <Button className="text-[10px] py-1 h-8 bg-yellow-600 hover:bg-yellow-500 border-none text-black" onClick={adminRevealAnswer}>停止作答</Button>}
              {gameState.status === 'REVEAL' && <Button className="text-[10px] py-1 h-8" onClick={adminShowLeaderboard}>顯示排行</Button>}
              {(gameState.status === 'LEADERBOARD' || gameState.status === 'REVEAL') && (
                  <Button className="text-[10px] py-1 h-8 bg-purple-600 border-none text-white" onClick={adminNextQuestion}>
                      {gameState.currentQuestionIndex >= questions.length - 1 ? '結束遊戲' : '下一題'} <ChevronRight size={12} />
                  </Button>
              )}
              {gameState.status === 'ENDED' && <Button variant="outline" className="text-[10px] py-1 h-8" onClick={adminStartGame}>重置系統</Button>}
           </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto hide-scrollbar relative">
          
          {!user && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-xl">
                 <Lock className="w-16 h-16 text-slate-500 mb-4" />
                 <h2 className="text-2xl font-bold text-white mb-2">需要身分驗證</h2>
                 <p className="text-slate-400 mb-6 text-sm">請登入員編以參與快問快答遊戲</p>
                 <Button onClick={() => setShowLoginModal(true)} variant="primary" className="shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                     登入遊戲
                 </Button>
            </div>
          )}

          {gameState.status === 'LOBBY' && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-float">
                  <div className="relative">
                      <div className="absolute inset-0 bg-poke-cyan blur-3xl opacity-20 animate-pulse"></div>
                      <Trophy size={80} className="text-poke-cyan relative z-10" />
                  </div>
                  <div>
                      <h2 className="text-4xl font-display font-bold text-white tracking-widest text-glow">對戰競技場</h2>
                      <p className="text-slate-400 mt-2 font-mono text-sm border-t border-slate-800 pt-2 inline-block px-4">等待主持人啟動遊戲...</p>
                  </div>
                  {user && (
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-6 py-3 rounded-full shadow-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-bold text-slate-300 text-sm">已連線: {user.name}</span>
                    </div>
                  )}
              </div>
          )}

          {(gameState.status === 'QUESTION' || gameState.status === 'REVEAL') && currentQ && (
              <div className="space-y-6 pt-4 pb-20">
                  <div className="flex justify-between items-end">
                      <span className="text-xs font-mono text-slate-500">Q-{gameState.currentQuestionIndex + 1} // {questions.length}</span>
                      <div className="flex items-center gap-2 text-xl font-mono font-bold">
                          <Clock size={20} className={timeLeft < 5 ? 'text-red-500 animate-bounce' : 'text-poke-cyan'} />
                          <span className={timeLeft < 5 ? 'text-red-500' : 'text-white'}>{timeLeft}</span>
                      </div>
                  </div>
                  
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div className={`h-full transition-all duration-300 linear ${timeLeft < 5 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-poke-cyan shadow-[0_0_10px_#06b6d4]'}`} style={{ width: `${(timeLeft / currentQ.timeLimit) * 100}%` }} />
                  </div>

                  <div className="bg-slate-900/80 p-8 rounded-2xl border border-poke-cyan/30 text-center shadow-[0_0_30px_rgba(6,182,212,0.1)] backdrop-blur-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-poke-cyan to-transparent opacity-50"></div>
                      <h3 className="text-2xl font-bold text-white leading-relaxed">{currentQ.question}</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                      {currentQ.options.map((opt, idx) => {
                          const isRevealed = gameState.status === 'REVEAL';
                          const isCorrect = idx === currentQ.correctAnswer;
                          const isSelected = selectedOption === idx;
                          
                          let cardClass = "bg-slate-900/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-500";
                          if (isRevealed) {
                              if (isCorrect) cardClass = "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                              else if (isSelected && !isCorrect) cardClass = "bg-red-500/20 border-red-500 text-red-400";
                              else cardClass = "opacity-30 grayscale";
                          } else if (isSelected) {
                              cardClass = "bg-poke-cyan/20 border-poke-cyan text-poke-cyan shadow-[0_0_15px_rgba(6,182,212,0.3)]";
                          }

                          return (
                              <button 
                                key={idx}
                                disabled={isRevealed || isAnswerSubmitted || !user}
                                onClick={() => handleSelectOption(idx)}
                                className={`p-5 rounded-xl font-bold text-lg flex justify-between items-center transition-all border-2 ${cardClass} relative overflow-hidden group`}
                              >
                                  <span className="relative z-10">{opt}</span>
                                  {isRevealed && isCorrect && <CheckCircle className="animate-bounce" />}
                                  {isRevealed && isSelected && !isCorrect && <XCircle />}
                                  {!isRevealed && <div className="absolute inset-0 bg-white/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>}
                              </button>
                          );
                      })}
                  </div>

                  {/* Submit Button Section */}
                  {gameState.status === 'QUESTION' && !isAnswerSubmitted && selectedOption !== null && (
                      <div className="fixed bottom-24 left-4 right-4 animate-bounce-in z-50">
                          <Button 
                             onClick={handleSubmitAnswer} 
                             variant="primary" 
                             className="w-full shadow-[0_0_30px_rgba(6,182,212,0.6)] py-4 text-xl border-2 border-white/50"
                          >
                              <Send className="mr-2" /> 確認送出答案
                          </Button>
                      </div>
                  )}
                  
                  {isAnswerSubmitted && gameState.status === 'QUESTION' && (
                      <div className="text-center text-poke-cyan animate-pulse font-mono font-bold">
                          答案已送出，等待結果...
                      </div>
                  )}

              </div>
          )}

          {(gameState.status === 'LEADERBOARD' || gameState.status === 'ENDED') && (
              <div className="pt-4">
                  {gameState.status === 'ENDED' && (
                      <div className="text-center mb-8 bg-slate-900/80 p-6 rounded-2xl border border-red-500/30">
                          <h2 className="text-5xl font-display font-bold text-poke-red text-glow tracking-widest mb-2">遊戲結束</h2>
                          <p className="text-slate-400 font-mono text-sm">連線終止</p>
                      </div>
                  )}
                  {renderLeaderboard()}
              </div>
          )}
      </div>

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => {}} />
      )}
    </div>
  );
};

export default Trivia;

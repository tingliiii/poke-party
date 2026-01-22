
import React, { useState, useEffect, useRef } from 'react';
import { TriviaQuestion } from '../types';
import * as DataService from '../services/dataService';
import Button from '../components/Button';
import { Plus, Trash2, ListOrdered, Clock, CheckCircle2, ShieldAlert, ChevronLeft, Save, Loader2, Edit, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
/* Fix: Explicitly import useNavigate from react-router-dom to resolve module export errors */
import { useNavigate } from 'react-router-dom';

const TriviaAdmin: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 狀態管理：編輯模式
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 表單狀態
  const [qId, setQId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIdx, setCorrectIdx] = useState(0);
  const [timeLimit, setTimeLimit] = useState(15);

  useEffect(() => {
    const unsubscribe = DataService.subscribeToQuestions((data) => {
      setQuestions(data);
      setLoading(false);
      
      // 非編輯模式下，自動計算下一題號
      if (!isEditing) {
        if (data.length > 0) {
          const lastId = Math.max(...data.map(q => parseInt(q.id) || 0));
          setQId((lastId + 1).toString());
        } else {
          setQId('1');
        }
      }
    });
    return () => unsubscribe();
  }, [isEditing]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectIdx(0);
    setTimeLimit(15);
    
    // 恢復下一個題號
    if (questions.length > 0) {
      const lastId = Math.max(...questions.map(q => parseInt(q.id) || 0));
      setQId((lastId + 1).toString());
    } else {
      setQId('1');
    }
  };

  const startEdit = (q: TriviaQuestion) => {
    setIsEditing(true);
    setEditingId(q.id);
    setQId(q.id);
    setQuestionText(q.question);
    setOptions([...q.options]);
    setCorrectIdx(q.correctAnswer);
    setTimeLimit(q.timeLimit);
    
    // 捲動到表單位置
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qId || !questionText || options.some(o => !o)) {
      alert("請填寫所有欄位");
      return;
    }

    setIsSubmitting(true);
    try {
      await DataService.addTriviaQuestion({
        id: qId,
        question: questionText,
        options,
        correctAnswer: correctIdx,
        timeLimit
      });
      resetForm();
      // alert(isEditing ? "題目已更新" : "題目已儲存");
    } catch (error) {
      alert("操作失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`確定要刪除第 ${id} 題嗎？`)) {
      await DataService.deleteTriviaQuestion(id);
      if (editingId === id) resetForm();
    }
  };

  // 順序調整邏輯：交換兩個 Doc 的內容
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const currentQ = questions[index];
    const targetQ = questions[targetIndex];

    try {
      setLoading(true);
      // 交換內容但保留原本的 Doc ID (即題號)
      // 使用 Promise.all 同步更新
      await Promise.all([
        DataService.addTriviaQuestion({
          ...targetQ,
          id: currentQ.id // 將目標內容放進目前 ID
        }),
        DataService.addTriviaQuestion({
          ...currentQ,
          id: targetQ.id // 將目前內容放進目標 ID
        })
      ]);
    } catch (error) {
      alert("順序調整失敗");
    } finally {
      setLoading(false);
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <ShieldAlert size={64} className="text-poke-red animate-pulse" />
        <h2 className="text-2xl font-display font-bold text-white">權限不足</h2>
        <p className="text-slate-400">只有工作人員可以管理題庫</p>
        <Button onClick={() => navigate('/')} variant="outline">回首頁</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 max-w-2xl mx-auto px-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-display font-bold text-poke-purple text-glow-purple">題庫管理中心</h2>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Question Database Management</p>
        </div>
      </div>

      {/* 新增/編輯題目表單 */}
      <section ref={formRef} className={`glass-panel p-6 rounded-2xl border-2 transition-all duration-500 relative overflow-hidden ${isEditing ? 'border-poke-cyan shadow-[0_0_30px_rgba(6,182,212,0.15)]' : 'border-poke-purple/30'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            {isEditing ? <Edit size={80} className="text-poke-cyan" /> : <Plus size={80} className="text-poke-purple" />}
        </div>
        
        <div className="flex justify-between items-center mb-6">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isEditing ? 'text-poke-cyan' : 'text-white'}`}>
                {isEditing ? <Edit size={20} /> : <ListOrdered size={20} className="text-poke-purple" />} 
                {isEditing ? `正在編輯第 ${qId} 題` : '新增題目'}
            </h3>
            {isEditing && (
                <button onClick={resetForm} className="text-slate-500 hover:text-white flex items-center gap-1 text-xs font-mono transition-colors">
                    <X size={14} /> 取消編輯
                </button>
            )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase">題號</label>
              <input 
                type="number" 
                value={qId} 
                onChange={e => setQId(e.target.value)}
                disabled={isEditing}
                className={`w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-poke-purple outline-none ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase">作答限時 (秒)</label>
              <input 
                type="number" 
                value={timeLimit} 
                onChange={e => setTimeLimit(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-poke-purple outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-slate-500 uppercase">題目內容</label>
            <textarea 
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-poke-purple outline-none min-h-[80px]"
              placeholder="例如：皮卡丘的屬性是什麼？"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-mono text-slate-500 uppercase">選項與正確答案</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <input 
                  type="radio" 
                  name="correct" 
                  checked={correctIdx === idx}
                  onChange={() => setCorrectIdx(idx)}
                  className="w-5 h-5 accent-poke-purple cursor-pointer"
                />
                <input 
                  type="text" 
                  value={opt}
                  onChange={e => handleOptionChange(idx, e.target.value)}
                  placeholder={`選項 ${idx + 1}`}
                  className={`flex-1 bg-slate-950 border rounded p-2 text-sm outline-none transition-all ${correctIdx === idx ? 'border-poke-purple text-white shadow-[inset_0_0_10px_rgba(216,180,254,0.05)]' : 'border-slate-800 text-slate-400'}`}
                />
              </div>
            ))}
          </div>

          <Button 
            fullWidth 
            type="submit" 
            disabled={isSubmitting} 
            variant={isEditing ? "primary" : "secondary"}
            className={isEditing ? "border-poke-cyan text-poke-cyan" : ""}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : (isEditing ? <><Save size={18} /> 更新題目內容</> : <><Plus size={18} /> 儲存並新增題目</>)}
          </Button>
        </form>
      </section>

      {/* 題目列表 */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ListOrdered size={20} className="text-poke-cyan" /> 目前題庫 ({questions.length})
            </h3>
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-tighter">Swipe left/right on items to access shortcuts</span>
        </div>
        
        {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-700" size={32} /></div>
        ) : (
            <div className="space-y-4">
                {questions.map((q, index) => (
                    <div key={q.id} className={`glass-panel p-4 rounded-xl border transition-all group relative ${editingId === q.id ? 'border-poke-cyan bg-poke-cyan/5 scale-[1.02]' : 'border-slate-800 hover:border-slate-600'}`}>
                        <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1 mr-4">
                                <div className="flex items-center gap-2">
                                    <span className={`text-black text-[10px] font-bold px-2 py-0.5 rounded ${editingId === q.id ? 'bg-poke-cyan' : 'bg-poke-purple'}`}>Q{q.id}</span>
                                    <span className="text-slate-500 text-[10px] font-mono flex items-center gap-1"><Clock size={10} /> {q.timeLimit}s</span>
                                </div>
                                <p className="text-white font-bold text-base leading-snug">{q.question}</p>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {q.options.map((opt, i) => (
                                        <div key={i} className={`text-[11px] px-3 py-1.5 rounded border flex items-center gap-2 ${q.correctAnswer === i ? 'border-green-500/50 text-green-400 bg-green-500/5' : 'border-slate-800/50 text-slate-500 bg-black/20'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${q.correctAnswer === i ? 'bg-green-400 animate-pulse' : 'bg-slate-700'}`}></div>
                                            <span className="truncate">{opt}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 控制按鈕組 */}
                            <div className="flex flex-col gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleMove(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1.5 text-slate-500 hover:text-poke-cyan disabled:opacity-10 transition-colors"
                                    title="上移"
                                >
                                    <ArrowUp size={16} />
                                </button>
                                <button 
                                    onClick={() => handleMove(index, 'down')}
                                    disabled={index === questions.length - 1}
                                    className="p-1.5 text-slate-500 hover:text-poke-cyan disabled:opacity-10 transition-colors"
                                    title="下移"
                                >
                                    <ArrowDown size={16} />
                                </button>
                                <div className="h-px bg-slate-800 my-1 mx-1"></div>
                                <button 
                                    onClick={() => startEdit(q)}
                                    className={`p-1.5 transition-colors ${editingId === q.id ? 'text-poke-cyan' : 'text-slate-500 hover:text-white'}`}
                                    title="編輯"
                                >
                                    <Edit size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(q.id)}
                                    className="p-1.5 text-slate-500 hover:text-poke-red transition-colors"
                                    title="刪除"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                
                {questions.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-3xl text-slate-700">
                        <ListOrdered size={40} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-mono tracking-widest uppercase">Database Access: No Questions Found</p>
                    </div>
                )}
            </div>
        )}
      </section>
    </div>
  );
};

export default TriviaAdmin;


import React, { useState } from 'react';
import { Note } from '../types';
import { summarizeNotes, generateQuiz } from '../services/geminiService';

interface AssistantModalProps {
  note: Note;
  onClose: () => void;
}

export const AssistantModal: React.FC<AssistantModalProps> = ({ note, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mode, setMode] = useState<'summary' | 'quiz' | null>(null);

  const handleAction = async (action: 'summary' | 'quiz') => {
    setLoading(true);
    setMode(action);
    try {
      const data = action === 'summary' ? await summarizeNotes(note.content) : await generateQuiz(note.content);
      setResult(data);
    } catch (e) {
      setResult("Vibe check failed. AI is offline.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/90 backdrop-blur-3xl animate-in zoom-in duration-300">
      <div className="w-full max-w-2xl glass-card rounded-[3.5rem] overflow-hidden border-accent/20 shadow-[0_0_100px_rgba(168,85,247,0.3)]">
        <div className="p-12">
          <div className="flex justify-between items-start mb-12">
            <div>
              <div className="text-[10px] font-black text-accent uppercase tracking-[0.4em] mb-4">Neural Assistant v3.0</div>
              <h2 className="text-4xl font-display font-black text-white leading-none tracking-tight">VIBE CHECKING...</h2>
              <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-widest">{note.title}</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {!mode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button onClick={() => handleAction('summary')} className="group p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-accent transition-all text-left">
                <div className="text-4xl mb-6 group-hover:scale-125 transition-transform duration-500">📝</div>
                <div className="font-black text-white text-xl mb-2">TL;DR</div>
                <p className="text-slate-500 text-xs font-bold leading-relaxed">Extract the juice from your notes instantly.</p>
              </button>
              <button onClick={() => handleAction('quiz')} className="group p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-secondary transition-all text-left">
                <div className="text-4xl mb-6 group-hover:scale-125 transition-transform duration-500">🔥</div>
                <div className="font-black text-white text-xl mb-2">QUICK TEST</div>
                <p className="text-slate-500 text-xs font-bold leading-relaxed">Spawn a micro-quiz to test your brain cells.</p>
              </button>
            </div>
          ) : (
            <div className="min-h-[300px] animate-in slide-in-from-bottom-5 duration-500">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-6"></div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Syncing Neurons...</div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 max-h-[400px] overflow-y-auto">
                    {mode === 'summary' ? (
                      <div className="text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">{result}</div>
                    ) : (
                      <div className="space-y-10">
                        {Array.isArray(result) && result.map((q, i) => (
                          <div key={i}>
                            <p className="text-xl font-display font-black text-white mb-6 leading-tight">{i + 1}. {q.question}</p>
                            <div className="grid gap-3">
                              {q.options.map((opt: string, j: number) => (
                                <button key={j} onClick={() => alert(j === q.correctAnswer ? "BIG BRAIN ENERGY! ✅" : "L + RATIO! ❌")} className="text-left p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-sm font-bold text-slate-400 hover:text-white">
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setMode(null)} className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest hover:underline">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    Back to Selection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';

export const Pomodoro: React.FC = () => {
    const [minutes, setMinutes] = useState(25);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isBreak, setIsBreak] = useState(false);

    useEffect(() => {
        let interval: any = null;
        if (isActive) {
            interval = setInterval(() => {
                if (seconds > 0) {
                    setSeconds(seconds - 1);
                } else if (minutes > 0) {
                    setMinutes(minutes - 1);
                    setSeconds(59);
                } else {
                    // Timer finished
                    const nextIsBreak = !isBreak;
                    setIsBreak(nextIsBreak);
                    setMinutes(nextIsBreak ? 5 : 25);
                    setSeconds(0);
                    setIsActive(false);
                    alert(nextIsBreak ? "Take a break, scholar! ☕" : "Break's over! Back to the grind. 📚");
                }
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, minutes, seconds, isBreak]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setMinutes(25);
        setSeconds(0);
        setIsBreak(false);
    };

    return (
        <div className="fixed bottom-8 right-8 z-[60] group">
            <div className={`glass-card p-6 rounded-[2.5rem] flex flex-col items-center gap-4 border-accent/20 transition-all ${isActive ? 'scale-110 shadow-[0_20px_60px_rgba(168,85,247,0.2)]' : 'hover:scale-105 shadow-xl'}`}>
                <div className="text-[10px] font-black text-accent uppercase tracking-[0.3em] leading-none mb-1">
                    {isBreak ? 'ZEN BREAK' : 'DEEP FOCUS'}
                </div>

                <div className="text-4xl font-display font-black text-white tracking-tighter">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={toggleTimer}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-accent/10 text-accent border border-accent/20'}`}
                    >
                        {isActive ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m7 4 12 8-12 8V4z" /></svg>
                        )}
                    </button>

                    <button
                        onClick={resetTimer}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    </button>
                </div>
            </div>

            <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-all pointer-events-none w-48 text-right">
                <span className="text-[9px] font-black text-white uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">Zen Study Timer</span>
            </div>
        </div>
    );
};

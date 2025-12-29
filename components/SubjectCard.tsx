
import React from 'react';
import { Subject } from '../types';

interface SubjectCardProps {
  subject: Subject;
  onClick: (id: string) => void;
  isAdmin: boolean;
  onDelete?: (id: string) => void;
  noteCount: number;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onClick, isAdmin, onDelete, noteCount }) => {
  return (
    <div
      onClick={() => onClick(subject.id)}
      className="group relative cursor-pointer glass-card rounded-[2.5rem] p-8 h-full flex flex-col transition-all duration-500 overflow-hidden card-hover-effect"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"></div>

      <div className="flex justify-between items-start mb-8 relative z-10">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-xl border border-white/5"
          style={{
            backgroundColor: `${subject.color}15`,
            color: subject.color,
          }}
        >
          {subject.icon}
        </div>

        <div className="px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white transition-all">
          {noteCount} Node{noteCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <h3 className="text-3xl font-display font-black text-white mb-3 group-hover:text-accent transition-colors leading-tight tracking-tighter">
          {subject.name}
        </h3>

        <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium group-hover:text-slate-300 transition-colors line-clamp-3">
          {subject.description}
        </p>

        <div className="mt-auto flex items-center text-[9px] font-black uppercase tracking-[0.4em] text-accent transform translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
          Sync Node
          <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(subject.id);
          }}
          className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 text-slate-700 hover:text-rose-500 transition-all p-2 hover:bg-rose-500/10 rounded-xl z-20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
        </button>
      )}
    </div>
  );
};

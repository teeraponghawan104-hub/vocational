import React, { useState } from 'react';
import { part2Questions } from '../data';
import { Choice, Part2Answer } from '../types';
import { cn } from '../lib/utils';

interface Props {
  initialAnswers?: Part2Answer[];
  onChange?: (answers: Part2Answer[]) => void;
  onComplete: (answers: Part2Answer[]) => void;
}

export default function Part2({ initialAnswers = [], onChange, onComplete }: Props) {
  const [answers, setAnswers] = useState<Record<number, Record<number, Choice>>>(() => {
    const init: Record<number, Record<number, Choice>> = {};
    initialAnswers.forEach(a => {
      init[a.questionId] = {
        1: a.sub1Choice,
        2: a.sub2Choice,
        3: a.sub3Choice
      };
    });
    return init;
  });

  const handleSelect = (qId: number, subId: number, choice: Choice) => {
    setAnswers(prev => {
      const qAns = { ...(prev[qId] || {}) };
      
      if (qAns[subId] === choice) {
        qAns[subId] = null;
      } else {
        if (choice !== null) {
          Object.keys(qAns).forEach(key => {
            if (qAns[parseInt(key)] === choice && parseInt(key) !== subId) {
              qAns[parseInt(key)] = null; // unset the duplicate
            }
          });
        }
        qAns[subId] = choice;
      }
      const newAnswers = { ...prev, [qId]: qAns };
      
      if (onChange) {
        const formatted = Object.keys(newAnswers).map(k => {
          const key = parseInt(k);
          return {
            questionId: key,
            sub1Choice: newAnswers[key]?.[1] || null,
            sub2Choice: newAnswers[key]?.[2] || null,
            sub3Choice: newAnswers[key]?.[3] || null,
          };
        });
        onChange(formatted as Part2Answer[]);
      }
      
      return newAnswers;
    });
  };

  const isComplete = part2Questions.every(q => {
    const qAns = answers[q.id];
    return qAns && qAns[1] && qAns[2] && qAns[3];
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 flex flex-col h-full">
      <div className="mb-4 shrink-0">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">ส่วนที่ 2 / 3</span>
        <h2 className="text-2xl font-bold text-slate-800 leading-tight">แบบทดสอบความถนัดทางอาชีพ (Basic Vocational Orientation)</h2>
        <p className="text-slate-500 mt-2">
          ในแต่ละข้อจะมี 3 ข้อย่อย ให้คุณเลือกตัวอักษรให้ครบทั้ง 3 ข้อ 
          <span className="font-bold underline text-red-600 ml-1">โดยห้ามเลือกตัวอักษรซ้ำกันในข้อเดียวกัน</span>
        </p>
      </div>

      <div className="space-y-6 flex-1 pb-10">
        {part2Questions.map((q, index) => (
          <div key={q.id} className="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-4">{index + 1}. {q.title}</h3>
            <div className="space-y-3">
              {q.subs.map(sub => {
                const currentAns = answers[q.id]?.[sub.id];
                // Disable options if already selected by another sub in the same question
                const usedA = Object.entries(answers[q.id] || {}).some(([k, v]) => parseInt(k) !== sub.id && v === 'A');
                const usedB = Object.entries(answers[q.id] || {}).some(([k, v]) => parseInt(k) !== sub.id && v === 'B');
                const usedX = Object.entries(answers[q.id] || {}).some(([k, v]) => parseInt(k) !== sub.id && v === 'X');

                return (
                  <div key={sub.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 hover:border-slate-300 transition-colors items-center">
                    <div className="flex items-center gap-3 sm:gap-4 col-span-1 lg:col-span-5 xl:col-span-6 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-slate-600 font-bold text-sm sm:text-base">2.{sub.id}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 text-sm sm:text-base leading-snug break-words">{sub.text}</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 col-span-1 lg:col-span-7 xl:col-span-6 w-full">
                      <button
                        type="button"
                        onClick={() => handleSelect(q.id, sub.id, 'A')}
                        className={cn(
                          "w-full px-3.5 py-3 rounded-xl border-2 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 select-none",
                          currentAns === 'A' 
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200/50 scale-[1.02] cursor-pointer" 
                            : usedA 
                            ? "border-slate-200 text-slate-400 bg-slate-50 cursor-pointer" 
                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 active:scale-[0.98] cursor-pointer"
                        )}
                      >
                        <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0", currentAns === 'A' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>A</span>
                        <span>ชอบ / ต้องการ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect(q.id, sub.id, 'B')}
                        className={cn(
                          "w-full px-3.5 py-3 rounded-xl border-2 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 select-none",
                          currentAns === 'B' 
                            ? "bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-200/50 scale-[1.02] cursor-pointer" 
                            : usedB 
                            ? "border-slate-200 text-slate-400 bg-slate-50 cursor-pointer" 
                            : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/40 active:scale-[0.98] cursor-pointer"
                        )}
                      >
                        <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0", currentAns === 'B' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>B</span>
                        <span>คิดดูก่อน / ไม่แน่ใจ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect(q.id, sub.id, 'X')}
                        className={cn(
                          "w-full px-3.5 py-3 rounded-xl border-2 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 select-none",
                          currentAns === 'X' 
                            ? "bg-slate-800 border-slate-800 text-white shadow-md shadow-slate-300/50 scale-[1.02] cursor-pointer" 
                            : usedX 
                            ? "border-slate-200 text-slate-400 bg-slate-50 cursor-pointer" 
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100/60 active:scale-[0.98] cursor-pointer"
                        )}
                      >
                        <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0", currentAns === 'X' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>X</span>
                        <span>ไม่ชอบ / ไม่ต้องการ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-slate-200 shrink-0">
        <button
          disabled={!isComplete}
          onClick={() => {
            const formatted = part2Questions.map(q => ({
              questionId: q.id,
              sub1Choice: answers[q.id]?.[1],
              sub2Choice: answers[q.id]?.[2],
              sub3Choice: answers[q.id]?.[3],
            }));
            onComplete(formatted as Part2Answer[]);
          }}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm transition-shadow",
            isComplete 
              ? "bg-slate-800 text-white hover:bg-slate-900 shadow-sm" 
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {isComplete ? "ถัดไป (ส่วนที่ 3)" : `กรุณาตอบให้ครบและไม่ซ้ำกันทุกข้อ`}
          {isComplete && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>}
        </button>
      </div>
    </div>
  );
}

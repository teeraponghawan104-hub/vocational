import React, { useState, useMemo } from 'react';
import { part1Questions } from '../data';
import { Choice, Part1Answer } from '../types';
import { cn } from '../lib/utils';

interface Props {
  initialAnswers?: Part1Answer[];
  onChange?: (answers: Part1Answer[]) => void;
  onComplete: (answers: Part1Answer[]) => void;
}

const gradients = [
  'bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-500 border-indigo-200',
  'bg-gradient-to-br from-emerald-100 to-teal-100 text-teal-600 border-teal-200',
  'bg-gradient-to-br from-orange-100 to-red-100 text-orange-500 border-orange-200',
  'bg-gradient-to-br from-purple-100 to-fuchsia-100 text-fuchsia-500 border-fuchsia-200',
  'bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-600 border-amber-200',
  'bg-gradient-to-br from-pink-100 to-rose-100 text-rose-500 border-rose-200'
];

const QuestionMedia = ({ q, index }: { q: any, index: number }) => {
  const Icon = q.icon;
  const ImageUrl = q.image;
  // Pick a consistent color based on question ID
  const colorClass = gradients[(q.id - 1) % gradients.length];
  
  return (
    <>
      {ImageUrl ? (
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-sm bg-slate-50 p-1.5">
          <img src={ImageUrl} alt={`Question ${index + 1}`} className="w-full h-full object-contain rounded-lg" />
        </div>
      ) : Icon ? (
        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${colorClass}`}>
          <Icon className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
        </div>
      ) : (
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
          <span className="text-lg sm:text-2xl font-bold text-slate-300">{index + 1}</span>
        </div>
      )}
    </>
  );
};

export default function Part3({ initialAnswers = [], onChange, onComplete }: Props) {
  // Shuffle questions only once on mount
  const shuffledQuestions = useMemo(() => {
    return [...part1Questions].sort(() => Math.random() - 0.5);
  }, []);

  const [answers, setAnswers] = useState<Record<number, Choice>>(() => {
    const init: Record<number, Choice> = {};
    initialAnswers.forEach(a => {
      init[a.questionId] = a.choice;
    });
    return init;
  });

  const handleSelect = (qId: number, choice: Choice) => {
    const newAnswers = { ...answers, [qId]: answers[qId] === choice ? null : choice };
    setAnswers(newAnswers);
    if (onChange) {
      const formatted = Object.keys(newAnswers).map(k => ({
        questionId: parseInt(k),
        choice: newAnswers[parseInt(k)]
      }));
      onChange(formatted);
    }
  };

  const isComplete = shuffledQuestions.every(q => answers[q.id] !== undefined);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 flex flex-col h-full">
      <div className="mb-4 shrink-0">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">ส่วนที่ 3 / 3</span>
        <h2 className="text-2xl font-bold text-slate-800 leading-tight">แบบทดสอบความมั่นใจในตนเอง (Self-Confidence Test)</h2>
        <p className="text-slate-500 mt-2">โปรดพิจารณาข้อความต่อไปนี้และเลือกคำตอบที่ตรงกับความสนใจของคุณอีกครั้ง เพื่อวัดความมั่นใจในการตัดสินใจของคุณ</p>
      </div>

      <div className="space-y-3 flex-1 pb-10">
        {shuffledQuestions.map((q, index) => {
          return (
            <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 hover:border-slate-300 transition-colors items-center">
              <div className="flex items-center gap-3 sm:gap-4 col-span-1 lg:col-span-5 xl:col-span-6 min-w-0">
                <QuestionMedia q={q} index={index} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-400 mb-0.5">ข้อที่ {index + 1}</div>
                  <h3 className="font-semibold text-slate-800 text-sm sm:text-base leading-snug break-words">{q.text}</h3>
                </div>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 col-span-1 lg:col-span-7 xl:col-span-6 w-full">
              <button
                onClick={() => handleSelect(q.id, 'A')}
                className={cn(
                  "w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg border flex items-center justify-center text-sm font-semibold transition-all",
                  answers[q.id] === 'A' 
                    ? "bg-slate-800 border-slate-900 text-white shadow-sm" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100"
                )}
              >
                A. ชอบ/ต้องการ
              </button>
              <button
                onClick={() => handleSelect(q.id, 'B')}
                className={cn(
                  "w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg border flex items-center justify-center text-sm font-semibold transition-all",
                  answers[q.id] === 'B' 
                    ? "bg-slate-800 border-slate-900 text-white shadow-sm" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100"
                )}
              >
                B. คิดดูก่อน/ไม่แน่ใจ
              </button>
              <button
                onClick={() => handleSelect(q.id, 'X')}
                className={cn(
                  "w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg border flex items-center justify-center text-sm font-semibold transition-all",
                  answers[q.id] === 'X' 
                    ? "bg-slate-800 border-slate-900 text-white shadow-sm" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100"
                )}
              >
                X. ไม่ชอบ/ไม่ต้องการ
              </button>
            </div>
          </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-slate-200 shrink-0">
        <button
          disabled={!isComplete}
          onClick={() => {
            const formatted = shuffledQuestions.map(q => ({
              questionId: q.id,
              choice: answers[q.id]
            }));
            onComplete(formatted);
          }}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm transition-shadow",
            isComplete 
              ? "bg-slate-800 text-white hover:bg-slate-900 shadow-sm" 
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {isComplete ? "ส่งคำตอบแบบทดสอบ" : `กรุณาตอบให้ครบทุกข้อ (${Object.keys(answers).length} / 54)`}
          {isComplete && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
        </button>
      </div>
    </div>
  );
}

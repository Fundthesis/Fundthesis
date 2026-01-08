"use client";
import React from 'react';
import { Question } from '@/app/lessonmodules/components/types';

type Props = {
  question: Question;
  onAnswer: (choiceIndex: number) => void;
  showResult: { correct: boolean; explanation?: string; selectedIndex?: number } | null;
  locked?: boolean;
};

const QuestionCard: React.FC<Props> = ({ question, onAnswer, showResult, locked }) => {
  const sanitizedExplanation = showResult?.correct && showResult.explanation
    ? showResult.explanation.replace(/^\s*(Nice|Correct),?\s*/i, '')
    : '';

  return (
    <div className="border border-stone-200 bg-white p-6">
      <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Question</p>
      <div className="font-serif text-lg text-black mb-4">{question.question}</div>
      <div className="space-y-2">
        {question.choices.map((c, i) => {
          const isLocked = Boolean(locked) || Boolean(showResult && showResult.correct === true);
          const isCorrectRevealed = !!showResult && showResult.correct === true && i === question.correctIndex;
          const isSelectedWrong = !!showResult && showResult.correct === false && showResult.selectedIndex === i;

          return (
            <button
              key={i}
              disabled={isLocked}
              onClick={() => onAnswer(i)}
              className={`w-full text-left px-4 py-3 border transition-colors font-serif ${isCorrectRevealed
                  ? 'bg-stone-100 border-stone-400'
                  : isSelectedWrong
                    ? 'bg-stone-50 border-stone-300'
                    : 'border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                }`}
            >
              <div className="flex items-center justify-between text-black">
                <div className="flex items-start gap-3">
                  <span className="text-stone-400 font-serif">{String.fromCharCode(65 + i)}.</span>
                  <span>{c}</span>
                </div>
                {isCorrectRevealed && (
                  <span className="text-xs uppercase tracking-widest text-stone-600">Correct</span>
                )}
                {isSelectedWrong && (
                  <span className="text-xs uppercase tracking-widest text-stone-500">Incorrect</span>
                )}
              </div>
              {showResult && showResult.correct === false && showResult.selectedIndex === i && question.explanations && (
                <div className="text-sm text-stone-600 mt-2 pl-6 italic">{question.explanations[i]}</div>
              )}
            </button>
          );
        })}
      </div>
      {showResult && showResult.correct && (
        <div className="mt-4 pt-4 border-t border-stone-200">
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-1">Excellent</p>
          <p className="font-serif text-stone-700 italic">
            {sanitizedExplanation || showResult.explanation || 'Well done.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;

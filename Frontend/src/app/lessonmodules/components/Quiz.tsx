"use client";
import React, { useState, useEffect } from 'react';
import QuestionCard from '@/app/lessonmodules/components/QuestionCard';
import Confetti from '@/app/lessonmodules/components/Confetti';
import { markQuestionAnswered } from '@/app/lessonmodules/data/userProgress';
import { saveResult } from '@/lib/dummyProgressDB';
import { Question } from '@/app/lessonmodules/components/types';
import { getStartingQuestionIndex, canNavigateToQuestion, isQuestionAnswered } from '@/app/lessonmodules/data/quizNavigation';

type Props = {
  moduleIndex: number;
  questions: Question[];
};

const Quiz: React.FC<Props> = ({ moduleIndex, questions }) => {
  const [current, setCurrent] = useState(() => getStartingQuestionIndex(moduleIndex, questions));
  const [showResult, setShowResult] = useState<{ correct: boolean; explanation?: string; selectedIndex?: number } | null>(null);
  const [confettiOn, setConfettiOn] = useState(false);

  useEffect(() => {
    setCurrent(getStartingQuestionIndex(moduleIndex, questions));
  }, [moduleIndex, questions]);

  const onAnswer = (choiceIndex: number) => {
    const q = questions[current];
    const correct = choiceIndex === q.correctIndex;
    const explanation = q.explanations?.[choiceIndex];
    setShowResult({ correct, explanation, selectedIndex: choiceIndex });
    try {
      saveResult(moduleIndex, q.id, correct);
    } catch {
      /* ignore */
    }
    if (correct) {
      markQuestionAnswered(moduleIndex, q.id, questions.length);
    }
    if (correct) {
      setConfettiOn(true);
      setTimeout(() => setConfettiOn(false), 2500);
    }
  };

  const next = () => {
    setShowResult(null);
    let firstUnanswered = questions.length - 1;
    for (let i = 0; i < questions.length; i++) {
      if (!isQuestionAnswered(moduleIndex, questions[i].id)) {
        firstUnanswered = i;
        break;
      }
    }
    const allowedMax = Math.min(firstUnanswered, questions.length - 1);
    setCurrent((c) => (c < allowedMax ? c + 1 : c));
  };

  const previous = () => {
    setShowResult(null);
    if (current > 0 && canNavigateToQuestion(moduleIndex, questions, current - 1)) {
      setCurrent((c) => c - 1);
    }
  };

  const canGoBack = current > 0 && canNavigateToQuestion(moduleIndex, questions, current - 1);
  let firstUnanswered = questions.length - 1;
  for (let i = 0; i < questions.length; i++) {
    if (!isQuestionAnswered(moduleIndex, questions[i].id)) {
      firstUnanswered = i;
      break;
    }
  }
  const allowedMax = Math.min(firstUnanswered, questions.length - 1);
  const canGoNext = current < allowedMax;

  return (
    <div className="w-full">
      {confettiOn && <Confetti />}
      <div className="space-y-4">
        <QuestionCard
          question={questions[current]}
          onAnswer={onAnswer}
          showResult={showResult}
          locked={!!(showResult && showResult.correct)}
        />
        <div className="flex items-center justify-between border-t border-stone-200 dark:border-stone-700 pt-4">
          <div>
            {canGoBack && (
              <button
                onClick={previous}
                className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Previous Question
              </button>
            )}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            Question {current + 1} of {questions.length}
          </div>
          <div>
            <button
              onClick={next}
              disabled={!canGoNext}
              className={`text-xs uppercase tracking-widest transition-colors ${canGoNext
                  ? 'text-stone-500 dark:text-stone-400 hover:text-black dark:hover:text-white'
                  : 'text-stone-300 dark:text-stone-600 cursor-not-allowed'
                }`}
            >
              Next Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;

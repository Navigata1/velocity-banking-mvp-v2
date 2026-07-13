'use client';

import { useCallback, useState } from 'react';
import { readSavedProgress, saveLearnProgress } from './progress-store';

export function parseTargetModule(value: string | null, lessonCount: number): number | null {
  if (!value) return null;
  const moduleNum = parseInt(value, 10);
  return moduleNum >= 1 && moduleNum <= lessonCount ? moduleNum : null;
}

export function useLearnProgress(lessonCount: number) {
  const [completed, setCompleted] = useState<Set<number>>(
    () => readSavedProgress(lessonCount).completed,
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number | null>>(
    () => readSavedProgress(lessonCount).quizAnswers,
  );
  const [justCompleted, setJustCompleted] = useState<number | null>(null);
  const [milestone, setMilestone] = useState<'half' | 'full' | null>(null);

  const save = (nextCompleted: Set<number>, nextAnswers: Record<number, number | null>) => {
    saveLearnProgress({ completed: nextCompleted, quizAnswers: nextAnswers });
  };

  const toggleComplete = (id: number) => {
    setCompleted((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
        setJustCompleted(null);
      } else {
        next.add(id);
        setJustCompleted(id);
        if (next.size === lessonCount) {
          setMilestone('full');
        } else if (next.size === Math.floor(lessonCount / 2)) {
          setMilestone('half');
        }
        setTimeout(() => setJustCompleted(null), 2500);
      }
      save(next, quizAnswers);
      return next;
    });
  };

  const clearMilestone = useCallback(() => setMilestone(null), []);

  const answerQuiz = (lessonId: number, answerIndex: number) => {
    setQuizAnswers((previous) => {
      const next = { ...previous, [lessonId]: answerIndex };
      save(completed, next);
      return next;
    });
  };

  return {
    completed,
    quizAnswers,
    toggleComplete,
    answerQuiz,
    justCompleted,
    milestone,
    clearMilestone,
  };
}

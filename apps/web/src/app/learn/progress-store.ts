export interface LearnProgress {
  completed: Set<number>;
  quizAnswers: Record<number, number | null>;
}

const STORAGE_KEY = 'interestshield-learn-progress';

function emptyProgress(): LearnProgress {
  return { completed: new Set(), quizAnswers: {} };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function moduleId(value: unknown, lessonCount: number): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id >= 1 && id <= lessonCount ? id : null;
}

function answerIndex(value: unknown): number | null | undefined {
  if (value === null) return null;
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 ? index : undefined;
}

export function sanitizeLearnProgress(raw: unknown, lessonCount: number): LearnProgress {
  if (!isObject(raw)) return emptyProgress();

  const completed = new Set<number>();
  if (Array.isArray(raw.completed)) {
    for (const value of raw.completed) {
      const id = moduleId(value, lessonCount);
      if (id != null) completed.add(id);
    }
  }

  const quizAnswers: Record<number, number | null> = {};
  if (isObject(raw.quizAnswers)) {
    for (const [key, value] of Object.entries(raw.quizAnswers)) {
      const id = moduleId(key, lessonCount);
      const answer = answerIndex(value);
      if (id != null && answer !== undefined) {
        quizAnswers[id] = answer;
      }
    }
  }

  return { completed, quizAnswers };
}

export function readSavedProgress(lessonCount: number): LearnProgress {
  if (typeof window === 'undefined') return emptyProgress();

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? sanitizeLearnProgress(JSON.parse(saved), lessonCount) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveLearnProgress(progress: LearnProgress): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completed: [...progress.completed],
        quizAnswers: progress.quizAnswers,
      })
    );
  } catch {
    // Local progress is optional demo state; failed writes should not block learning.
  }
}

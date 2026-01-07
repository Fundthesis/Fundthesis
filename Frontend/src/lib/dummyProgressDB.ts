// Small local "dummy" DB to hold correctness values until real auth/backend is available.
const KEY = 'ft_dummy_db_v1';

type Entry = { module: number; questionId: string; correct: boolean; time: string };

function read(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Entry[];
  } catch {
    return [];
  }
}

function write(entries: Entry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}

export function saveResult(moduleIndex: number, questionId: string, correct: boolean) {
  const entries = read();
  entries.push({ module: moduleIndex, questionId, correct, time: new Date().toISOString() });
  write(entries);
}

export function getResultsForModule(moduleIndex: number) {
  return read().filter(e => e.module === moduleIndex);
}

export function clearResults() {
  write([]);
}

const dummyProgressDB = { saveResult, getResultsForModule, clearResults };
export default dummyProgressDB;

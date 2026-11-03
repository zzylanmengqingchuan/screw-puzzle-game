// scores.js — localStorage-based scoring and progress system
const STORAGE_KEY = 'screw_game_records';
const MAX_RECORDS_PER_LEVEL = 20;

let _startTime = null;
let _elapsed = 0;
let _moves = 0;
let _hintsUsed = 0;
let _undosUsed = 0;
let _maxBufferUsed = 0;

export function startTimer() {
  _startTime = performance.now();
  _elapsed = 0;
}

export function stopTimer() {
  if (_startTime !== null) {
    _elapsed = (performance.now() - _startTime) / 1000;
    _startTime = null;
  }
}

export function getElapsedSeconds() {
  if (_startTime !== null) {
    return (performance.now() - _startTime) / 1000;
  }
  return _elapsed;
}

export function recordMove(screwId) {
  _moves++;
}

export function getMoveCount() {
  return _moves;
}

export function recordHintUsed() {
  _hintsUsed++;
}

export function recordUndoUsed() {
  _undosUsed++;
}

export function getMaxBufferUsed() {
  return _maxBufferUsed;
}

export function updateMaxBuffer(n) {
  if (n > _maxBufferUsed) _maxBufferUsed = n;
}

export function onLevelComplete(levelId, won) {
  stopTimer();
  const record = {
    levelId,
    timestamp: Date.now(),
    timeSeconds: parseFloat(getElapsedSeconds().toFixed(2)),
    moves: _moves,
    hintsUsed: _hintsUsed,
    undosUsed: _undosUsed,
    maxBufferUsed: _maxBufferUsed,
    assisted: _hintsUsed > 0 || _undosUsed > 0,
    won
  };
  const all = _loadAll();
  if (!all[levelId]) all[levelId] = [];
  all[levelId].unshift(record);
  if (all[levelId].length > MAX_RECORDS_PER_LEVEL) {
    all[levelId] = all[levelId].slice(0, MAX_RECORDS_PER_LEVEL);
  }
  _saveAll(all);
  return record;
}

export function getRecords(levelId) {
  const all = _loadAll();
  return all[levelId] || [];
}

export function getBestRecord(levelId) {
  const records = getRecords(levelId).filter(r => r.won);
  if (records.length === 0) return null;
  // Prefer unassisted, fastest
  const unassisted = records.filter(r => !r.assisted);
  const pool = unassisted.length > 0 ? unassisted : records;
  pool.sort((a, b) => a.timeSeconds - b.timeSeconds);
  return pool[0];
}

export function resetCurrentRun() {
  _startTime = null;
  _elapsed = 0;
  _moves = 0;
  _hintsUsed = 0;
  _undosUsed = 0;
  _maxBufferUsed = 0;
}

// Internal helpers
function _loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function _saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* storage full — silently fail */ }
}

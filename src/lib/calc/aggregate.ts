import { epleyOneRm } from "./oneRm";
import type { SetWithExercise } from "../db/sets";

export interface DayValue {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface ExerciseCount {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  count: number;
}

export interface ExerciseStat {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  maxWeight: number;
  maxReps: number;
  maxOneRm: number;
  totalSets: number;
  totalVolume: number;
}

/** セット単位のボリューム (重量 × 回数)。自重は0扱い */
export function setVolume(s: { weight_kg: number | null; reps: number }): number {
  if (s.weight_kg == null) return 0;
  return s.weight_kg * s.reps;
}

/** 日ごとの総ボリュームを時系列昇順で返す */
export function totalVolumeByDate(sets: SetWithExercise[]): DayValue[] {
  const map = new Map<string, number>();
  for (const s of sets) {
    map.set(s.performed_on, (map.get(s.performed_on) ?? 0) + setVolume(s));
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

/** 指定種目の日ごと最大1RM推移 */
export function maxOneRmByDate(
  sets: SetWithExercise[],
  exerciseId: number
): DayValue[] {
  const map = new Map<string, number>();
  for (const s of sets) {
    if (s.exercise_id !== exerciseId) continue;
    const v = epleyOneRm(s.weight_kg, s.reps);
    const cur = map.get(s.performed_on) ?? 0;
    if (v > cur) map.set(s.performed_on, v);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

/** 曜日別のトレーニング回数 (日曜=0 ... 土曜=6) */
export function frequencyByDayOfWeek(
  sets: SetWithExercise[]
): { dow: number; count: number }[] {
  const daySet = new Set<string>();
  sets.forEach((s) => daySet.add(s.performed_on));
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const date of daySet) {
    const d = new Date(date + "T00:00:00");
    counts[d.getDay()]++;
  }
  return counts.map((count, dow) => ({ dow, count }));
}

/** 種目別の実施セット数ランキング (降順) */
export function exerciseRanking(sets: SetWithExercise[]): ExerciseCount[] {
  const map = new Map<number, ExerciseCount>();
  for (const s of sets) {
    const cur = map.get(s.exercise_id);
    if (cur) {
      cur.count++;
    } else {
      map.set(s.exercise_id, {
        exerciseId: s.exercise_id,
        name: s.name,
        muscleGroup: s.muscle_group,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** 種目別の最大重量・最大レップ・最大1RM・総ボリューム */
export function statsByExercise(sets: SetWithExercise[]): ExerciseStat[] {
  const map = new Map<number, ExerciseStat>();
  for (const s of sets) {
    let stat = map.get(s.exercise_id);
    if (!stat) {
      stat = {
        exerciseId: s.exercise_id,
        name: s.name,
        muscleGroup: s.muscle_group,
        maxWeight: 0,
        maxReps: 0,
        maxOneRm: 0,
        totalSets: 0,
        totalVolume: 0,
      };
      map.set(s.exercise_id, stat);
    }
    stat.totalSets++;
    stat.totalVolume += setVolume(s);
    if ((s.weight_kg ?? 0) > stat.maxWeight) stat.maxWeight = s.weight_kg ?? 0;
    if (s.reps > stat.maxReps) stat.maxReps = s.reps;
    const rm = epleyOneRm(s.weight_kg, s.reps);
    if (rm > stat.maxOneRm) stat.maxOneRm = rm;
  }
  return [...map.values()].sort((a, b) => b.maxOneRm - a.maxOneRm);
}

/** トレーニング実施日数 */
export function distinctDayCount(sets: SetWithExercise[]): number {
  return new Set(sets.map((s) => s.performed_on)).size;
}

/**
 * ISO週番号 (年と週)。Schoenfeld流の「週あたりセット数」評価用。
 * 週は月曜始まり。
 */
function isoWeekKey(date: string): string {
  const d = new Date(date + "T00:00:00");
  // ISO週: 木曜日のある週がその年の第◯週
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff =
    (target.valueOf() - firstThursday.valueOf()) / 86400000 / 7;
  const week = 1 + Math.floor(diff);
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export interface WeeklyMuscleSets {
  week: string; // 例 "2026-W15"
  byMuscle: Record<string, number>;
}

/** 週ごと・部位ごとの実施セット数 */
export function weeklySetsByMuscle(
  sets: SetWithExercise[]
): WeeklyMuscleSets[] {
  const map = new Map<string, Map<string, number>>();
  for (const s of sets) {
    const wk = isoWeekKey(s.performed_on);
    let inner = map.get(wk);
    if (!inner) {
      inner = new Map();
      map.set(wk, inner);
    }
    inner.set(s.muscle_group, (inner.get(s.muscle_group) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, inner]) => ({
      week,
      byMuscle: Object.fromEntries(inner),
    }));
}

/** 期間内の「週あたり平均セット数」を部位ごとに算出 */
export function avgWeeklySetsByMuscle(
  sets: SetWithExercise[]
): Record<string, number> {
  const weekly = weeklySetsByMuscle(sets);
  if (weekly.length === 0) return {};
  const totals: Record<string, number> = {};
  for (const w of weekly) {
    for (const [mg, n] of Object.entries(w.byMuscle)) {
      totals[mg] = (totals[mg] ?? 0) + n;
    }
  }
  const avg: Record<string, number> = {};
  for (const [mg, t] of Object.entries(totals)) {
    avg[mg] = t / weekly.length;
  }
  return avg;
}

/**
 * Schoenfeldガイドラインに基づく評価:
 *   < 5: 不足、5-9: 維持、10-20: 最適、>20: 過剰の可能性
 */
export type VolumeStatus = "low" | "maintain" | "optimal" | "excess";

export function evaluateWeeklyVolume(setsPerWeek: number): VolumeStatus {
  if (setsPerWeek < 5) return "low";
  if (setsPerWeek < 10) return "maintain";
  if (setsPerWeek <= 20) return "optimal";
  return "excess";
}

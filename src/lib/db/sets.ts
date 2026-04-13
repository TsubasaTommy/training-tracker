import { db } from "./client";
import type { Exercise, WorkoutSet } from "../types";

export interface SetWithExercise extends WorkoutSet {
  name: string;
  muscle_group: string;
}

async function joinExercises(sets: WorkoutSet[]): Promise<SetWithExercise[]> {
  if (sets.length === 0) return [];
  const ids = Array.from(new Set(sets.map((s) => s.exercise_id)));
  const exs = (await db.exercises.bulkGet(ids)) as (Exercise | undefined)[];
  const map = new Map<number, Exercise>();
  exs.forEach((e) => {
    if (e) map.set(e.id, e);
  });
  return sets.map((s) => {
    const e = map.get(s.exercise_id);
    return {
      ...s,
      name: e?.name ?? "(削除済み)",
      muscle_group: e?.muscle_group ?? "other",
    };
  });
}

export async function getSetsForDate(
  performedOn: string
): Promise<WorkoutSet[]> {
  const list = await db.sets
    .where("performed_on")
    .equals(performedOn)
    .toArray();
  return list.sort(
    (a, b) => a.exercise_id - b.exercise_id || a.set_order - b.set_order
  );
}

export async function getSetsBetween(
  from: string,
  to: string,
  muscleGroup?: string | null
): Promise<SetWithExercise[]> {
  const base = await db.sets
    .where("performed_on")
    .between(from, to, true, true)
    .toArray();
  const joined = await joinExercises(base);
  const filtered = muscleGroup
    ? joined.filter((s) => s.muscle_group === muscleGroup)
    : joined;
  return filtered.sort(
    (a, b) =>
      a.performed_on.localeCompare(b.performed_on) ||
      a.exercise_id - b.exercise_id ||
      a.set_order - b.set_order
  );
}

export async function getAllSets(): Promise<SetWithExercise[]> {
  const base = await db.sets.toArray();
  const joined = await joinExercises(base);
  return joined.sort(
    (a, b) =>
      a.performed_on.localeCompare(b.performed_on) ||
      a.exercise_id - b.exercise_id ||
      a.set_order - b.set_order
  );
}

export async function getDatesWithSets(): Promise<string[]> {
  const all = await db.sets.orderBy("performed_on").uniqueKeys();
  return (all as string[]).sort((a, b) => b.localeCompare(a));
}

export async function addSet(input: {
  performed_on: string;
  exercise_id: number;
  weight_kg: number | null;
  reps: number;
  memo?: string | null;
}): Promise<number> {
  return db.transaction("rw", db.sets, async () => {
    const existing = await db.sets
      .where("[exercise_id+performed_on]")
      .equals([input.exercise_id, input.performed_on])
      .toArray();
    const nextOrder =
      existing.reduce((max, s) => Math.max(max, s.set_order), 0) + 1;
    const id = await db.sets.add({
      performed_on: input.performed_on,
      exercise_id: input.exercise_id,
      set_order: nextOrder,
      weight_kg: input.weight_kg,
      reps: input.reps,
      memo: input.memo ?? null,
      created_at: new Date().toISOString(),
    } as WorkoutSet);
    return id as number;
  });
}

export async function updateSet(
  id: number,
  input: { weight_kg: number | null; reps: number; memo?: string | null }
): Promise<void> {
  await db.sets.update(id, {
    weight_kg: input.weight_kg,
    reps: input.reps,
    memo: input.memo ?? null,
  });
}

export async function deleteSet(id: number): Promise<void> {
  await db.transaction("rw", db.sets, async () => {
    const target = await db.sets.get(id);
    if (!target) return;
    await db.sets.delete(id);
    // set_order を詰め直す
    const remaining = await db.sets
      .where("[exercise_id+performed_on]")
      .equals([target.exercise_id, target.performed_on])
      .sortBy("set_order");
    await Promise.all(
      remaining.map((s, idx) =>
        s.set_order === idx + 1
          ? Promise.resolve(0)
          : db.sets.update(s.id, { set_order: idx + 1 })
      )
    );
  });
}

export async function deleteExerciseDay(
  performedOn: string,
  exerciseId: number
): Promise<void> {
  await db.sets
    .where("[exercise_id+performed_on]")
    .equals([exerciseId, performedOn])
    .delete();
}

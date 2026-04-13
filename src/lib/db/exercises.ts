import { db } from "./client";
import type { Exercise, MuscleGroup, ThresholdSet } from "../types";

const MUSCLE_ORDER: MuscleGroup[] = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "other",
];

function sortExercises(list: Exercise[]): Exercise[] {
  return [...list].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived - b.archived;
    const ma = MUSCLE_ORDER.indexOf(a.muscle_group);
    const mb = MUSCLE_ORDER.indexOf(b.muscle_group);
    if (ma !== mb) return ma - mb;
    return a.name.localeCompare(b.name, "ja");
  });
}

export async function listExercises(
  opts: { includeArchived?: boolean } = {}
): Promise<Exercise[]> {
  const all = opts.includeArchived
    ? await db.exercises.toArray()
    : await db.exercises.where("archived").equals(0).toArray();
  return sortExercises(all);
}

export async function getExercise(id: number): Promise<Exercise | null> {
  return (await db.exercises.get(id)) ?? null;
}

export interface ExerciseInput {
  name: string;
  muscle_group: MuscleGroup;
  uses_weight: boolean;
  standards_male?: ThresholdSet | null;
  standards_female?: ThresholdSet | null;
}

export async function createExercise(input: ExerciseInput): Promise<number> {
  const id = await db.exercises.add({
    name: input.name.trim(),
    muscle_group: input.muscle_group,
    uses_weight: input.uses_weight ? 1 : 0,
    archived: 0,
    created_at: new Date().toISOString(),
    standards_male: input.standards_male ?? null,
    standards_female: input.standards_female ?? null,
  } as Exercise);
  return id as number;
}

export async function updateExercise(
  id: number,
  input: ExerciseInput
): Promise<void> {
  await db.exercises.update(id, {
    name: input.name.trim(),
    muscle_group: input.muscle_group,
    uses_weight: input.uses_weight ? 1 : 0,
    standards_male: input.standards_male ?? null,
    standards_female: input.standards_female ?? null,
  });
}

export async function setArchived(id: number, archived: boolean): Promise<void> {
  await db.exercises.update(id, { archived: archived ? 1 : 0 });
}

export async function deleteExercise(id: number): Promise<void> {
  const refs = await db.sets.where("exercise_id").equals(id).count();
  if (refs > 0) {
    throw new Error(
      "この種目にはセット記録があるため削除できません。アーカイブしてください。"
    );
  }
  await db.exercises.delete(id);
}

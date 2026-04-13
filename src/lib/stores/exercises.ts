import { writable } from "svelte/store";
import type { Exercise } from "../types";
import { listExercises } from "../db/exercises";

export const exercisesStore = writable<Exercise[]>([]);

export async function refreshExercises(): Promise<void> {
  const list = await listExercises({ includeArchived: true });
  exercisesStore.set(list);
}

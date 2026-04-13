<script lang="ts">
  import type { Exercise, MuscleGroup } from "../lib/types";
  import { MUSCLE_GROUPS, muscleLabel } from "../lib/types";
  import {
    createExercise,
    deleteExercise,
    setArchived,
    updateExercise,
  } from "../lib/db/exercises";
  import { exercisesStore, refreshExercises } from "../lib/stores/exercises";

  let exercises = $state<Exercise[]>([]);
  $effect(() => {
    const unsub = exercisesStore.subscribe((v) => (exercises = v));
    return unsub;
  });

  let newName = $state("");
  let newMuscle = $state<MuscleGroup>("chest");
  let newUsesWeight = $state(true);

  async function onAdd(e: SubmitEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      await createExercise({
        name,
        muscle_group: newMuscle,
        uses_weight: newUsesWeight,
      });
      newName = "";
      await refreshExercises();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  let editingId = $state<number | null>(null);
  let editName = $state("");
  let editMuscle = $state<MuscleGroup>("chest");
  let editUses = $state(true);

  function startEdit(ex: Exercise) {
    editingId = ex.id;
    editName = ex.name;
    editMuscle = ex.muscle_group;
    editUses = ex.uses_weight === 1;
  }

  async function saveEdit(id: number) {
    await updateExercise(id, {
      name: editName,
      muscle_group: editMuscle,
      uses_weight: editUses,
    });
    editingId = null;
    await refreshExercises();
  }

  async function onArchive(ex: Exercise) {
    await setArchived(ex.id, ex.archived === 0);
    await refreshExercises();
  }

  async function onDelete(ex: Exercise) {
    if (!confirm(`「${ex.name}」を削除しますか？`)) return;
    try {
      await deleteExercise(ex.id);
      await refreshExercises();
    } catch (err) {
      alert((err as Error).message);
    }
  }
</script>

<div class="flex flex-col gap-4">
  <h1 class="text-2xl font-bold">種目マスタ</h1>

  <form onsubmit={onAdd} class="card flex flex-wrap items-end gap-3">
    <div class="flex flex-col">
      <label class="label" for="ex-name">種目名</label>
      <input
        id="ex-name"
        type="text"
        class="input w-56"
        placeholder="例: インクラインベンチプレス"
        bind:value={newName}
        required
      />
    </div>
    <div class="flex flex-col">
      <label class="label" for="ex-muscle">部位</label>
      <select id="ex-muscle" class="input" bind:value={newMuscle}>
        {#each MUSCLE_GROUPS as g (g.value)}
          <option value={g.value}>{g.label}</option>
        {/each}
      </select>
    </div>
    <label class="flex items-center gap-1 text-sm">
      <input type="checkbox" bind:checked={newUsesWeight} />
      重量あり
    </label>
    <button type="submit" class="btn-primary">追加</button>
  </form>

  <div class="card overflow-hidden p-0">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500">
        <tr>
          <th class="px-4 py-2 text-left">種目名</th>
          <th class="px-4 py-2 text-left">部位</th>
          <th class="px-4 py-2 text-left">重量</th>
          <th class="px-4 py-2 text-left">状態</th>
          <th class="px-4 py-2 text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        {#each exercises as ex (ex.id)}
          <tr class="border-t border-slate-100 {ex.archived ? 'bg-slate-50 text-slate-400' : ''}">
            {#if editingId === ex.id}
              <td class="px-4 py-2">
                <input class="input w-full" bind:value={editName} />
              </td>
              <td class="px-4 py-2">
                <select class="input" bind:value={editMuscle}>
                  {#each MUSCLE_GROUPS as g (g.value)}
                    <option value={g.value}>{g.label}</option>
                  {/each}
                </select>
              </td>
              <td class="px-4 py-2">
                <input type="checkbox" bind:checked={editUses} />
              </td>
              <td class="px-4 py-2">
                {ex.archived ? "アーカイブ" : "有効"}
              </td>
              <td class="px-4 py-2 text-right">
                <button class="btn-primary" onclick={() => saveEdit(ex.id)}>保存</button>
                <button class="btn-ghost" onclick={() => (editingId = null)}>
                  キャンセル
                </button>
              </td>
            {:else}
              <td class="px-4 py-2 font-medium">{ex.name}</td>
              <td class="px-4 py-2">{muscleLabel(ex.muscle_group)}</td>
              <td class="px-4 py-2">{ex.uses_weight ? "あり" : "自重"}</td>
              <td class="px-4 py-2">{ex.archived ? "アーカイブ" : "有効"}</td>
              <td class="px-4 py-2 text-right whitespace-nowrap">
                <button class="btn-ghost" onclick={() => startEdit(ex)}>編集</button>
                <button class="btn-ghost" onclick={() => onArchive(ex)}>
                  {ex.archived ? "復活" : "アーカイブ"}
                </button>
                <button class="btn-ghost text-rose-600" onclick={() => onDelete(ex)}>
                  削除
                </button>
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

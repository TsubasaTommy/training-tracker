<script lang="ts">
  import type { Exercise } from "../types";
  import { muscleLabel, MUSCLE_GROUPS } from "../types";

  interface Props {
    exercises: Exercise[];
    excludeIds?: number[];
    onselect: (exercise: Exercise) => void;
    onclose: () => void;
  }
  let { exercises, excludeIds = [], onselect, onclose }: Props = $props();

  let keyword = $state("");
  let muscleFilter = $state<string>("");

  const filtered = $derived(
    exercises.filter((e) => {
      if (e.archived) return false;
      if (excludeIds.includes(e.id)) return false;
      if (muscleFilter && e.muscle_group !== muscleFilter) return false;
      if (keyword && !e.name.includes(keyword)) return false;
      return true;
    })
  );
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40"
  onclick={onclose}
  role="presentation"
>
  <div
    class="w-[520px] max-w-[90vw] rounded-lg bg-white p-5 shadow-xl"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
  >
    <h2 class="mb-3 text-lg font-semibold">種目を選択</h2>
    <div class="mb-3 flex gap-2">
      <input
        type="text"
        placeholder="種目名で検索..."
        class="input flex-1"
        bind:value={keyword}
      />
      <select class="input" bind:value={muscleFilter}>
        <option value="">部位(全て)</option>
        {#each MUSCLE_GROUPS as g (g.value)}
          <option value={g.value}>{g.label}</option>
        {/each}
      </select>
    </div>

    <div class="max-h-80 overflow-y-auto">
      {#if filtered.length === 0}
        <div class="py-8 text-center text-sm text-slate-400">
          該当する種目がありません
        </div>
      {:else}
        <ul class="flex flex-col gap-1">
          {#each filtered as ex (ex.id)}
            <li>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-slate-100"
                onclick={() => onselect(ex)}
              >
                <span class="font-medium">{ex.name}</span>
                <span class="text-xs text-slate-500">
                  {muscleLabel(ex.muscle_group)}
                  {#if !ex.uses_weight}・自重{/if}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="mt-4 flex justify-end">
      <button type="button" class="btn-secondary" onclick={onclose}>閉じる</button>
    </div>
  </div>
</div>

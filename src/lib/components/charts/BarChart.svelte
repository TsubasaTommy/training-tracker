<script lang="ts">
  /** 軽量SVG横棒グラフ（ランキング表示向け） */
  interface Item {
    label: string;
    value: number;
    sub?: string;
  }

  interface Props {
    data: Item[];
    color?: string;
    maxValue?: number;
  }

  let { data, color = "#4f46e5", maxValue }: Props = $props();

  const maxV = $derived(
    maxValue ?? (data.length === 0 ? 1 : Math.max(...data.map((d) => d.value), 1))
  );
</script>

{#if data.length === 0}
  <div class="py-8 text-center text-sm text-slate-400">データなし</div>
{:else}
  <div class="flex flex-col gap-2">
    {#each data as d (d.label)}
      <div class="flex items-center gap-2">
        <div class="w-32 shrink-0 truncate text-sm text-slate-700" title={d.label}>
          {d.label}
        </div>
        <div class="relative flex-1 h-6 rounded bg-slate-100">
          <div
            class="absolute left-0 top-0 h-full rounded"
            style="width:{(d.value / maxV) * 100}%; background-color:{color};"
          ></div>
          <div
            class="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium text-slate-800"
          >
            {d.value}{d.sub ? " " + d.sub : ""}
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

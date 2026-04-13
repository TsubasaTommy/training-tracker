<script lang="ts">
  interface Props {
    label: string;
    value: string | number;
    sub?: string;
    accent?: "indigo" | "emerald" | "amber" | "rose";
  }
  let { label, value, sub, accent = "indigo" }: Props = $props();

  const accents = {
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  } as const;
</script>

<div class="card">
  <div class="label">{label}</div>
  <div class="mt-1 text-2xl font-bold {accents[accent]}">{value}</div>
  {#if sub}
    <div class="mt-1 text-xs text-slate-500">{sub}</div>
  {/if}
</div>

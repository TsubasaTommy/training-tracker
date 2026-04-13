<script lang="ts">
  import { format, subDays, startOfYear } from "date-fns";

  interface Props {
    from: string;
    to: string;
    onchange: (range: { from: string; to: string }) => void;
  }
  let { from = $bindable(), to = $bindable(), onchange }: Props = $props();

  type Preset = "7d" | "30d" | "90d" | "year" | "all" | "custom";
  let active = $state<Preset>("30d");

  function apply(preset: Preset) {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    let newFrom = from;
    let newTo = todayStr;

    switch (preset) {
      case "7d":
        newFrom = format(subDays(today, 6), "yyyy-MM-dd");
        break;
      case "30d":
        newFrom = format(subDays(today, 29), "yyyy-MM-dd");
        break;
      case "90d":
        newFrom = format(subDays(today, 89), "yyyy-MM-dd");
        break;
      case "year":
        newFrom = format(startOfYear(today), "yyyy-MM-dd");
        break;
      case "all":
        newFrom = "2000-01-01";
        break;
      case "custom":
        // 入力値そのまま
        active = "custom";
        return;
    }
    active = preset;
    from = newFrom;
    to = newTo;
    onchange({ from: newFrom, to: newTo });
  }

  function onCustomChange() {
    active = "custom";
    onchange({ from, to });
  }

  const presets: { key: Preset; label: string }[] = [
    { key: "7d", label: "直近7日" },
    { key: "30d", label: "直近30日" },
    { key: "90d", label: "直近90日" },
    { key: "year", label: "今年" },
    { key: "all", label: "全期間" },
  ];
</script>

<div class="flex flex-wrap items-center gap-2">
  {#each presets as p (p.key)}
    <button
      type="button"
      class="btn {active === p.key ? 'btn-primary' : 'btn-secondary'}"
      onclick={() => apply(p.key)}
    >
      {p.label}
    </button>
  {/each}
  <span class="ml-2 text-sm text-slate-500">カスタム:</span>
  <input type="date" class="input" bind:value={from} onchange={onCustomChange} />
  <span>〜</span>
  <input type="date" class="input" bind:value={to} onchange={onCustomChange} />
</div>

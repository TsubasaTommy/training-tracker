<script lang="ts">
  /**
   * 軽量SVG折れ線グラフ。日付ラベル + 数値1系列。
   */
  interface DataPoint {
    date: string;
    value: number;
  }

  interface Props {
    data: DataPoint[];
    height?: number;
    color?: string;
    yLabel?: string;
  }

  let {
    data,
    height = 240,
    color = "#4f46e5",
    yLabel = "",
  }: Props = $props();

  const width = 720;
  const padding = { top: 16, right: 16, bottom: 32, left: 48 };

  const innerW = $derived(width - padding.left - padding.right);
  const innerH = $derived(height - padding.top - padding.bottom);

  const maxY = $derived(
    data.length === 0 ? 1 : Math.max(...data.map((d) => d.value), 1)
  );
  // Y軸メモリ（5段階）
  const yTicks = $derived(
    Array.from({ length: 5 }, (_, i) => (maxY * (i + 1)) / 5)
  );

  function x(i: number): number {
    if (data.length <= 1) return padding.left + innerW / 2;
    return padding.left + (innerW * i) / (data.length - 1);
  }
  function y(v: number): number {
    return padding.top + innerH - (v / maxY) * innerH;
  }

  const pathD = $derived(
    data.length === 0
      ? ""
      : data
          .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.value)}`)
          .join(" ")
  );

  const areaD = $derived(
    data.length === 0
      ? ""
      : `${pathD} L ${x(data.length - 1)} ${padding.top + innerH} L ${x(0)} ${padding.top + innerH} Z`
  );

  // X軸ラベル: 表示数を絞る (最大8)
  const xLabelStep = $derived(Math.max(1, Math.ceil(data.length / 8)));

  function fmtY(v: number): string {
    if (v >= 10000) return (v / 1000).toFixed(0) + "k";
    if (v >= 1000) return (v / 1000).toFixed(1) + "k";
    if (v >= 100) return v.toFixed(0);
    return v.toFixed(1);
  }
</script>

{#if data.length === 0}
  <div class="flex h-40 items-center justify-center text-sm text-slate-400">
    データなし
  </div>
{:else}
  <svg viewBox={`0 0 ${width} ${height}`} class="w-full" style="max-height:{height}px">
    <!-- Y軸グリッドとラベル -->
    {#each yTicks as t (t)}
      <line
        x1={padding.left}
        x2={padding.left + innerW}
        y1={y(t)}
        y2={y(t)}
        stroke="#e2e8f0"
        stroke-dasharray="3 3"
      />
      <text
        x={padding.left - 6}
        y={y(t)}
        text-anchor="end"
        dominant-baseline="middle"
        font-size="10"
        fill="#64748b"
      >
        {fmtY(t)}
      </text>
    {/each}

    <!-- 領域塗りつぶし -->
    <path d={areaD} fill={color} fill-opacity="0.1" />

    <!-- 折れ線 -->
    <path
      d={pathD}
      fill="none"
      stroke={color}
      stroke-width="2"
      stroke-linejoin="round"
      stroke-linecap="round"
    />

    <!-- 点 -->
    {#each data as d, i (d.date + i)}
      <circle cx={x(i)} cy={y(d.value)} r="2.5" fill={color} />
    {/each}

    <!-- X軸ラベル -->
    {#each data as d, i (d.date + "x")}
      {#if i % xLabelStep === 0 || i === data.length - 1}
        <text
          x={x(i)}
          y={padding.top + innerH + 16}
          text-anchor="middle"
          font-size="10"
          fill="#64748b"
        >
          {d.date.slice(5)}
        </text>
      {/if}
    {/each}

    <!-- Y軸タイトル -->
    {#if yLabel}
      <text
        x={12}
        y={padding.top + innerH / 2}
        text-anchor="middle"
        font-size="11"
        fill="#475569"
        transform={`rotate(-90, 12, ${padding.top + innerH / 2})`}
      >
        {yLabel}
      </text>
    {/if}
  </svg>
{/if}

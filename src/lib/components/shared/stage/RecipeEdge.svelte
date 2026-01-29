<script lang="ts">
	import { BaseEdge, EdgeLabel, getBezierPath, type EdgeProps } from '@xyflow/svelte';

	let {
		id,
		label,
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
	}: EdgeProps = $props();

	let [edgePath, labelX, labelY] = $derived(
		getBezierPath({
			sourceX,
			sourceY,
			targetX,
			targetY,
			sourcePosition,
			targetPosition,
		}),
	);
</script>

<BaseEdge
	{id}
	path={edgePath}
	class="[--xy-edge-stroke-selected:var(--color-base-content)] [--xy-edge-stroke:color-mix(in_oklab,var(--color-base-content)_50%,transparent)]"
/>

{#if label}
	<EdgeLabel x={labelX} y={labelY} selectEdgeOnClick class="badge badge-soft badge-xs">
		{label}
	</EdgeLabel>
{/if}

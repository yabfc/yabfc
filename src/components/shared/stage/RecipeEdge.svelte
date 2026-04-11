<script lang="ts">
	import { BaseEdge, EdgeLabel, getBezierPath, type EdgeProps } from '@xyflow/svelte';

	let {
		id,
		label,
		source,
		sourceX,
		sourceY,
		target,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
	}: EdgeProps = $props();

	const isSelfLoop = $derived(source === target);

	let [normalPath, normalLabelX, normalLabelY] = $derived(
		getBezierPath({
			sourceX,
			sourceY,
			targetX,
			targetY,
			sourcePosition,
			targetPosition,
		}),
	);

	let selfLoopPath = $derived.by(() => {
		const loopOut = 36;
		const loopUp = 50;

		return `
			M ${sourceX} ${sourceY}
			C ${sourceX + loopOut} ${sourceY},
			 ${sourceX + loopOut} ${sourceY - loopUp},
			 ${sourceX} ${sourceY - loopUp}
			L ${targetX} ${targetY - loopUp}
			C ${targetX - loopOut} ${targetY - loopUp},
			 ${targetX - loopOut} ${targetY},
			 ${targetX} ${targetY}
		`;
	});
	let edgePath = $derived(isSelfLoop ? selfLoopPath : normalPath);
	let labelX = $derived(isSelfLoop ? sourceX + 27 : normalLabelX);
	let labelY = $derived(isSelfLoop ? sourceY - 25 : normalLabelY);
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

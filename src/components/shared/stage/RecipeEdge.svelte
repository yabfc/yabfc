<script lang="ts">
	import type { EdgeData, Edge as EdgeModel } from '@/lib/models/factory';
	import { BaseEdge, EdgeLabel, getBezierPath, type EdgeProps, type Edge } from '@xyflow/svelte';

	let {
		id,
		source,
		sourceX,
		sourceY,
		target,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		data,
	}: EdgeProps<Edge<EdgeData>> = $props();

	const isSelfLoop = $derived(source === target);
	const edgeLabels = $derived(data?.edgeLabels ?? []);
	const isMultiEdge = $derived(edgeLabels.length > 1);
	const loopOut = 36,
		loopUp = 50;

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
	let labelX = $derived(isSelfLoop ? sourceX + loopOut : normalLabelX);
	let labelY = $derived(isSelfLoop ? sourceY - 25 : normalLabelY);

	function onEdgeClick() {
		if (!data) return;
		if (edgeLabels.length !== 1) return;

		data.onEdgeView(edgeLabels[0].edge);
	}

	function onEdgeLabelClick(event: MouseEvent, edge: EdgeModel) {
		event.stopPropagation();
		data?.onEdgeView(edge);
	}
</script>

<BaseEdge
	{id}
	path={edgePath}
	class="[--xy-edge-stroke-selected:var(--color-base-content)] [--xy-edge-stroke:color-mix(in_oklab,var(--color-base-content)_50%,transparent)]"
	onclick={onEdgeClick}
/>

{#if edgeLabels.length > 0}
	<EdgeLabel x={labelX} y={labelY}>
		<div
			class={[
				'flex max-w-64 flex-col gap-1',
				isSelfLoop ? 'translate-x-1/2 items-start' : 'items-center',
			]}
		>
			{#each edgeLabels as edgeLabel}
				<button
					type="button"
					class="badge badge-soft badge-xs nodrag nopan h-auto min-h-4 max-w-full cursor-pointer gap-1 px-1.5 py-0.5"
					title={edgeLabel.itemName}
					onclick={(event: MouseEvent) => onEdgeLabelClick(event, edgeLabel.edge)}
				>
					{#if isMultiEdge}
						<span class="max-w-32 truncate">{edgeLabel.itemName}:</span>
					{/if}
					<span class="tabular-nums">{edgeLabel.amount}</span>
				</button>
			{/each}
		</div>
	</EdgeLabel>
{/if}

<script lang="ts">
	import StageRecipeChain from '@/lib/components/shared/StageRecipeChain.svelte';
	import layout from '@/lib/stage/layout';
	import active from '@/lib/stores/active.svelte';
	import { stage } from '@/lib/stores/stage.svelte';
	import { type Edge, type Node } from '@xyflow/svelte';
	import { nanoid } from 'nanoid';

	let nodes = $state.raw<Node[]>([]),
		edges = $state.raw<Edge[]>([]);

	const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });

	// update nodes and edges if global state recipe nodes or edges change
	$effect(() => {
		const newNodes = stage.nodes.map(x => ({
			id: x.id,
			type: 'recipe',
			position: { x: 0, y: 0 },
			data: { recipeNode: x },
		}));

		const newEdges = stage.edges.map(x => ({
			id: nanoid(),
			type: 'recipe',
			source: x.from,
			target: x.to,
			label: `${formatter.format(x.amount)}x ${active.profile?.getItemById(x.itemId)?.getDisplayName() ?? x.itemId}`,
		}));

		const layouted = layout(newNodes, newEdges);

		nodes = layouted.nodes;
		edges = layouted.edges;
	});
</script>

<div class="h-screen w-screen">
	<StageRecipeChain {nodes} {edges} />
</div>

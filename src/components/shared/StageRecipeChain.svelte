<script lang="ts">
	import RecipeEdgeComponent from '@/components/shared/stage/RecipeEdge.svelte';
	import RecipeNodeComponent from '@/components/shared/stage/RecipeNode.svelte';
	import {
		Background,
		BackgroundVariant,
		SvelteFlow,
		type Edge,
		type Node,
	} from '@xyflow/svelte';

	let { nodes = [], edges = [] }: { nodes?: Node[]; edges?: Edge[] } = $props();

	const nodeTypes = { recipe: RecipeNodeComponent };
	const edgeTypes = { recipe: RecipeEdgeComponent };
</script>

<SvelteFlow
	{nodes}
	{edges}
	{nodeTypes}
	{edgeTypes}
	proOptions={{ hideAttribution: true }}
	nodesConnectable={false}
	deleteKey={null}
	fitView
	class="[--background-color:var(--color-base-100)]"
>
	<Background
		variant={BackgroundVariant.Dots}
		class="opacity-50 [--xy-background-pattern-color:var(--color-base-content)]"
	/>
</SvelteFlow>

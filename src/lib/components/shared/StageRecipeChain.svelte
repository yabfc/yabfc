<script lang="ts">
	import RecipeNodeComponent from '@/lib/components/shared/stage/RecipeNode.svelte';
	import type { RecipeEdge, RecipeNode } from '@/lib/models/node';
	import dagre from '@dagrejs/dagre';
	import {
		Background,
		BackgroundVariant,
		Position,
		SvelteFlow,
		type Edge,
		type Node,
	} from '@xyflow/svelte';
	import { nanoid } from 'nanoid';

	let {
		nodes: recipeNodes = [],
		edges: recipeEdges = [],
	}: { nodes?: RecipeNode[]; edges?: RecipeEdge[] } = $props();

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	const nodeTypes = { recipe: RecipeNodeComponent };

	// map nodes
	nodes = recipeNodes.map(x => ({
		id: x.id,
		type: 'recipe',
		position: { x: 0, y: 0 },
		data: { recipeNode: x },
	}));

	// map edges
	edges = recipeEdges.map(x => ({
		id: nanoid(),
		source: x.from,
		target: x.to,
		label: `${x.amount}x ${x.itemId}`,
	}));

	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));

	// CONSIDER moving this function, removing hard-coded fallback size
	function getLayoutedElements(nodes: Node[], edges: Edge[]) {
		dagreGraph.setGraph({ rankdir: 'LR' });

		edges.forEach(edge => dagreGraph.setEdge(edge.source, edge.target));
		nodes.forEach(node =>
			dagreGraph.setNode(node.id, {
				...node,
				width: node.measured?.width ?? 300,
				height: node.measured?.height ?? 80,
			}),
		);

		dagre.layout(dagreGraph);

		return {
			nodes: nodes.map<Node>(node => {
				const nodeWithPosition = dagreGraph.node(node.id);

				// We are shifting the dagre node position (anchor=center center) to the top left
				// so it matches the Svelte Flow node anchor point (top left).
				return {
					...node,
					position: {
						x: nodeWithPosition.x - (node.measured?.width ?? 300) / 2,
						y: nodeWithPosition.y - (node.measured?.height ?? 80) / 2,
					},
					sourcePosition: Position.Right,
					targetPosition: Position.Left,
				};
			}),
			edges,
		};
	}

	// svelte-ignore state_referenced_locally
	const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);

	nodes = layoutedNodes;
	edges = layoutedEdges;
</script>

<SvelteFlow
	bind:nodes
	bind:edges
	{nodeTypes}
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

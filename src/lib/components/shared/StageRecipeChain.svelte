<script lang="ts">
	import type Profile from '@/lib/models/profile';
	import type { RecipeVariant } from '@/lib/models/recipe';
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

	let { profile, recipeChain = [] }: { profile: Profile; recipeChain?: RecipeVariant[] } =
		$props();

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	// generate nodes
	nodes = recipeChain.map(x => ({
		id: x.id,
		position: { x: 0, y: 0 },
		data: { label: x.id },
	}));

	// generate edges
	recipeChain.forEach(producer => {
		producer.out.forEach(output => {
			const consumers = recipeChain.filter(x => x.in.some(input => input.id === output.id));

			consumers.forEach(consumer => {
				const item = profile.getItemById(output.id);

				edges = [
					...edges,
					{
						id: nanoid(),
						source: producer.id,
						target: consumer.id,
						label: item?.name ?? output.id,
					},
				];
			});
		});
	});

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
	proOptions={{ hideAttribution: true }}
	nodesConnectable={false}
	deleteKey={null}
	fitView
>
	<Background variant={BackgroundVariant.Dots} />
</SvelteFlow>

<script lang="ts">
	import FactoryStageControls from '@/components/factory/FactoryStageControls.svelte';
	import FactoryRecipeNodeComponent from '@/components/shared/stage/FactoryRecipeNode.svelte';
	import ItemInputNode from '@/components/shared/stage/ItemInputNode.svelte';
	import ItemOutputNode from '@/components/shared/stage/ItemOutputNode.svelte';
	import RecipeEdgeComponent from '@/components/shared/stage/RecipeEdge.svelte';
	import { calculateRecipeNodeEdgeAmounts, recalculateEdgeAmounts } from '@/lib/factory/edge';
	import { rebuildFactory } from '@/lib/factory/factory';
	import type {
		Edge as EdgeModel,
		MachineConfiguration,
		RecipeNodeEdgeAmounts,
	} from '@/lib/models/factory';
	import layout from '@/lib/stage/layout';
	import active from '@/stores/active.svelte';
	import factory from '@/stores/factory.svelte';
	import {
		Background,
		BackgroundVariant,
		SvelteFlow,
		type Edge,
		type Node,
	} from '@xyflow/svelte';
	import { untrack } from 'svelte';

	let {
		onEditMachineConfig,
		onEdgeView,
	}: {
		onEditMachineConfig: (config: MachineConfiguration) => void;
		onEdgeView: (edge: EdgeModel) => void;
	} = $props();

	let nodes = $state.raw<Node[]>([]),
		edges = $state.raw<Edge[]>([]),
		recipeNodeEdgeAmounts = $state<RecipeNodeEdgeAmounts>({});

	const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });

	$effect(() => {
		recipeNodeEdgeAmounts = calculateRecipeNodeEdgeAmounts(factory);
	});

	$effect(() => {
		let newNodes: Node[] = Object.values(factory.recipeNodes).map(x => ({
			id: x.id,
			type: 'recipe',
			position: { x: 0, y: 0 },
			data: {
				recipeNode: x,
				usedInputs: recipeNodeEdgeAmounts[x.id]?.usedInputs ?? {},
				usedOutputs: recipeNodeEdgeAmounts[x.id]?.usedOutputs ?? {},
				onRecipeChange: (nodeId: string, recipeId: string) => {
					if (!active.profile) return;
					rebuildFactory(active.profile, factory, nodeId, recipeId);
				},
				onEditMachineConfig: (config: MachineConfiguration) => {
					onEditMachineConfig(config);
				},
			},
		}));

		// push inputs
		newNodes.push(
			...Object.values(factory.inputs).map(x => ({
				id: x.id,
				type: 'itemInput',
				position: { x: 0, y: 0 },
				data: {
					item: x,
					onAmountChange: (itemId: string, amount: number) => {
						if (!active.profile) return;
						factory.inputs[itemId] = {
							...factory.inputs[itemId],
							amount: amount,
						};
						recalculateEdgeAmounts(active.profile, factory);
					},
				},
			})),
		);

		// push outputs
		newNodes.push(
			...Object.values(factory.outputs).map(x => ({
				id: x.id,
				type: 'itemOutput',
				position: { x: 0, y: 0 },
				data: {
					item: x,
					onAmountChange: (itemId: string, amount: number) => {
						if (!active.profile) return;
						factory.outputs[itemId] = {
							...factory.outputs[itemId],
							amount: amount,
						};
						recalculateEdgeAmounts(active.profile, factory);
					},
				},
			})),
		);

		const newEdges = factory.edges.map(x => ({
			id: `${x.from}-${x.to}`,
			type: 'recipe',
			source: x.from,
			target: x.to,
			label: `${formatter.format(x.actualAmount)}`,
			data: {
				edge: x,
				onEdgeView: (edge: EdgeModel) => {
					onEdgeView(edge);
				},
			},
		}));

		const hasNewNodes = untrack(() => {
			const oldIds = new Set(nodes.map(node => node.id));
			return newNodes.some(node => !oldIds.has(node.id));
		});

		// only reset the layout if new nodes were added
		if (hasNewNodes && newNodes.length > 0) {
			const layouted = layout(newNodes, newEdges);

			nodes = layouted.nodes;
			edges = layouted.edges;
			return;
		}

		const existingPositions = untrack(() => {
			return new Map(nodes.map(node => [node.id, node.position]));
		});

		nodes = newNodes.map(node => ({
			...node,
			position: existingPositions.get(node.id) ?? node.position,
		}));

		edges = newEdges;
	});

	const nodeTypes = {
		recipe: FactoryRecipeNodeComponent,
		itemInput: ItemInputNode,
		itemOutput: ItemOutputNode,
	};
	const edgeTypes = { recipe: RecipeEdgeComponent };
</script>

<div class="h-screen w-screen">
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		{edgeTypes}
		proOptions={{ hideAttribution: true }}
		nodesConnectable={false}
		deleteKey={null}
		fitView
		class="[--background-color:var(--color-base-100)]"
	>
		<FactoryStageControls />

		<Background
			variant={BackgroundVariant.Dots}
			class="opacity-50 [--xy-background-pattern-color:var(--color-base-content)]"
		/>
	</SvelteFlow>
</div>

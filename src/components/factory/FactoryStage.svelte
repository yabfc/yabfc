<script lang="ts">
	import FactoryRecipeNodeComponent from '@/components/shared/stage/FactoryRecipeNode.svelte';
	import ItemInputNode from '@/components/shared/stage/ItemInputNode.svelte';
	import ItemOutputNode from '@/components/shared/stage/ItemOutputNode.svelte';
	import RecipeEdgeComponent from '@/components/shared/stage/RecipeEdge.svelte';
	import {
		calculateRecipeNodeTargets,
		rebuildFactory,
		recalculateEdgeAmounts,
	} from '@/lib/factory/factory';
	import type { MachineConfiguration, RecipeNodeTargets } from '@/lib/models/factory';
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
	import { nanoid } from 'nanoid';

	let {
		onEditMachineConfig,
	}: {
		onEditMachineConfig: (config: MachineConfiguration) => void;
	} = $props();

	let nodes = $state.raw<Node[]>([]),
		edges = $state.raw<Edge[]>([]),
		recipeNodeTargetIo = $state<RecipeNodeTargets>({});

	const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });

	$effect(() => {
		if (!active.profile) return;
		recipeNodeTargetIo = calculateRecipeNodeTargets(active.profile, factory);
	});

	$effect(() => {
		let newNodes: Node[] = Object.values(factory.recipeNodes).map(x => ({
			id: x.id,
			type: 'recipe',
			position: { x: 0, y: 0 },
			data: {
				recipeNode: x,
				targetInputs: recipeNodeTargetIo[x.id]?.targetInputs ?? {},
				targetOutputs: recipeNodeTargetIo[x.id]?.targetOutputs ?? {},
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
						recipeNodeTargetIo = calculateRecipeNodeTargets(active.profile, factory);
					},
				},
			})),
		);

		const newEdges = factory.edges.map(x => ({
			id: nanoid(),
			type: 'recipe',
			source: x.from,
			target: x.to,
			label: `${formatter.format(x.actualAmount)}`,
		}));

		const layouted = layout(newNodes, newEdges);

		nodes = layouted.nodes;
		edges = layouted.edges;
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
</div>

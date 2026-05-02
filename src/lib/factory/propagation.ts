import {
	calculateRequiredIncomingEdgeAmounts,
	createEdgeAmountContext,
	createEdgeLookup,
	recalculateEdgeAmounts,
	type EdgeLookup,
} from '@/lib/factory/edge';
import { calculateInput, calculateOutput } from '@/lib/factory/factory';
import type { Edge, Factory, RecipeNode } from '@/lib/models/factory';
import type Profile from '@/lib/models/profile';

export type PropagationDirection = 'left' | 'right';

type LeftPropagationOptions = {
	blockedNodeId?: string;
	skippedInputItemIds?: Set<string>;
};

function getNodeItemAmount(
	profile: Profile,
	node: RecipeNode,
	itemId: string,
	side: 'input' | 'output',
): number {
	const amounts =
		side === 'input' ? calculateInput(profile, node) : calculateOutput(profile, node);

	return amounts[itemId] ?? 0;
}

function scaleNodeToItemAmount(
	profile: Profile,
	node: RecipeNode,
	itemId: string,
	amount: number,
	side: 'input' | 'output',
	onlyIncrease = false,
): void {
	const currentAmount = getNodeItemAmount(profile, node, itemId, side);
	if (onlyIncrease && currentAmount >= amount) return;
	const scale = amount / currentAmount;

	for (const config of node.machines) {
		config.machineCount = Math.ceil(config.machineCount * scale);
	}
}

function distributeAmount(
	amount: number,
	entries: Edge[],
	getWeight: (entry: Edge) => number,
): { entry: Edge; amount: number }[] {
	if (amount <= 0 || entries.length === 0) return [];

	const weights = entries.map(entry => Math.max(0, getWeight(entry)));
	const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

	if (totalWeight <= 0) {
		const amountPerEntry = amount / entries.length;
		return entries.map(entry => ({ entry, amount: amountPerEntry }));
	}

	return entries.map((entry, index) => ({
		entry,
		amount: amount * (weights[index] / totalWeight),
	}));
}

function getRecipeProducerEdges(
	factory: Factory,
	lookup: EdgeLookup,
	targetNodeId: string,
	itemId: string,
): Edge[] {
	return (lookup.incoming.get(targetNodeId) ?? []).filter(edge => {
		return edge.itemId === itemId && factory.recipeNodes[edge.from];
	});
}

function getInputEdges(
	factory: Factory,
	lookup: EdgeLookup,
	targetNodeId: string,
	itemId: string,
): Edge[] {
	return (lookup.incoming.get(targetNodeId) ?? []).filter(edge => {
		return edge.itemId === itemId && factory.inputs[edge.from];
	});
}

function getTotalProducerDemand(
	profile: Profile,
	factory: Factory,
	lookup: EdgeLookup,
	producerNodeId: string,
	itemId: string,
): number {
	const requiredIncomingAmounts = calculateRequiredIncomingEdgeAmounts(
		createEdgeAmountContext(profile, factory),
	);

	return (lookup.outgoing.get(producerNodeId) ?? [])
		.filter(edge => edge.itemId === itemId && factory.recipeNodes[edge.to])
		.reduce((sum, edge) => sum + (requiredIncomingAmounts.get(edge) ?? 0), 0);
}

function increaseInputNodes(factory: Factory, edges: Edge[], requiredAmount: number): void {
	const shares = distributeAmount(requiredAmount, edges, edge => {
		return factory.inputs[edge.from]?.amount ?? 0;
	});

	for (const { entry: edge, amount } of shares) {
		const input = factory.inputs[edge.from];
		if (!input || input.amount >= amount) continue;

		input.amount = amount;
	}
}

function propagateLeftFromNode(
	profile: Profile,
	factory: Factory,
	lookup: EdgeLookup,
	nodeId: string,
	path = new Set<string>(),
	options: LeftPropagationOptions = {},
): void {
	if (path.has(nodeId) || options.blockedNodeId === nodeId) return;

	const node = factory.recipeNodes[nodeId];

	let requiredInputs: Record<string, number>;
	let currentNodeId = nodeId;

	if (node) {
		requiredInputs = calculateInput(profile, node);
		currentNodeId = node.id;
	} else if (factory.outputs[nodeId]) {
		requiredInputs = {
			[nodeId]: factory.outputs[nodeId].amount,
		};
	} else {
		return;
	}

	const nextPath = new Set(path);
	nextPath.add(nodeId);

	for (const [itemId, requiredAmount] of Object.entries(requiredInputs)) {
		if (options.skippedInputItemIds?.has(itemId)) continue;

		const producerEdges = getRecipeProducerEdges(factory, lookup, currentNodeId, itemId);
		const inputEdges = getInputEdges(factory, lookup, currentNodeId, itemId);

		if (producerEdges.length === 0) {
			increaseInputNodes(factory, inputEdges, requiredAmount);
			continue;
		}

		for (const edge of producerEdges) {
			const producerNode = factory.recipeNodes[edge.from];
			if (
				!producerNode ||
				nextPath.has(producerNode.id) ||
				options.blockedNodeId === producerNode.id
			)
				continue;

			const downstreamRecipeDemand = getTotalProducerDemand(
				profile,
				factory,
				lookup,
				producerNode.id,
				itemId,
			);

			const demand = factory.outputs[currentNodeId]
				? requiredAmount + downstreamRecipeDemand
				: downstreamRecipeDemand;

			scaleNodeToItemAmount(profile, producerNode, itemId, demand, 'output', true);
			propagateLeftFromNode(profile, factory, lookup, producerNode.id, nextPath, options);
		}
	}
}

function propagateRightFromNode(
	profile: Profile,
	factory: Factory,
	lookup: EdgeLookup,
	nodeId: string,
	adjustedNodeIds: Set<string>,
	path = new Set<string>(),
): void {
	if (path.has(nodeId)) return;

	const node = factory.recipeNodes[nodeId];

	let availableOutputs: Record<string, number>;
	let currentNodeId = nodeId;

	if (node) {
		availableOutputs = calculateOutput(profile, node);
		currentNodeId = node.id;
	} else if (factory.inputs[nodeId]) {
		availableOutputs = {
			[nodeId]: factory.inputs[nodeId].amount,
		};
	} else {
		return;
	}

	const nextPath = new Set(path);
	nextPath.add(nodeId);

	for (const [itemId, availableAmount] of Object.entries(availableOutputs)) {
		const consumerEdges = (lookup.outgoing.get(currentNodeId) ?? []).filter(edge => {
			return edge.itemId === itemId && factory.recipeNodes[edge.to];
		});

		const shares = distributeAmount(availableAmount, consumerEdges, edge => {
			if (edge.actualAmount > 0) return edge.actualAmount;

			const consumerNode = factory.recipeNodes[edge.to];
			if (!consumerNode) return 0;

			return getNodeItemAmount(profile, consumerNode, itemId, 'input');
		});

		for (const { entry: edge, amount } of shares) {
			const consumerNode = factory.recipeNodes[edge.to];
			if (!consumerNode || nextPath.has(consumerNode.id)) continue;

			scaleNodeToItemAmount(profile, consumerNode, itemId, amount, 'input');
			adjustedNodeIds.add(consumerNode.id);
			propagateRightFromNode(
				profile,
				factory,
				lookup,
				consumerNode.id,
				adjustedNodeIds,
				nextPath,
			);
		}
	}
}

function getOutputIdsForChangedNodes(factory: Factory, changedNodeIds: Set<string>) {
	return new Set(
		factory.edges
			.filter(edge => changedNodeIds.has(edge.from) && factory.outputs[edge.to])
			.map(edge => edge.to),
	);
}

function updateOutputNodesFromAvailableSupply(
	profile: Profile,
	factory: Factory,
	changedNodeIds: Set<string>,
) {
	const changedOutputIds = getOutputIdsForChangedNodes(factory, changedNodeIds);

	for (const outputId of changedOutputIds) {
		const output = factory.outputs[outputId];
		if (!output) continue;

		const amount = factory.edges
			.filter(edge => edge.to === outputId)
			.reduce((sum, edge) => {
				const sourceNode = factory.recipeNodes[edge.from];
				if (!sourceNode) return sum;

				return sum + (calculateOutput(profile, sourceNode)[edge.itemId] ?? 0);
			}, 0);

		factory.outputs[outputId] = { ...output, amount };
	}
}

export function propagateResources(
	profile: Profile,
	factory: Factory,
	nodeId: string,
	direction: PropagationDirection,
): void {
	const lookup = createEdgeLookup(factory.edges);

	if (direction === 'left') {
		propagateLeftFromNode(profile, factory, lookup, nodeId);
		recalculateEdgeAmounts(profile, factory);
		return;
	}

	const adjustedNodeIds = new Set<string>();
	propagateRightFromNode(profile, factory, lookup, nodeId, adjustedNodeIds);

	const sourceOutputItemIds = new Set<string>();
	if (factory.inputs[nodeId]) {
		sourceOutputItemIds.add(nodeId);
	} else {
		Object.keys(calculateOutput(profile, factory.recipeNodes[nodeId])).forEach(itemId => {
			sourceOutputItemIds.add(itemId);
		});
	}

	for (const adjustedNodeId of [...adjustedNodeIds].reverse()) {
		Object.keys(calculateOutput(profile, factory.recipeNodes[adjustedNodeId])).forEach(
			itemId => {
				sourceOutputItemIds.add(itemId);
			},
		);
	}

	const backfillOptions = {
		blockedNodeId: nodeId,
		skippedInputItemIds: sourceOutputItemIds,
	};

	for (const adjustedNodeId of [...adjustedNodeIds].reverse()) {
		propagateLeftFromNode(
			profile,
			factory,
			lookup,
			adjustedNodeId,
			new Set<string>(),
			backfillOptions,
		);
	}

	updateOutputNodesFromAvailableSupply(profile, factory, new Set([nodeId, ...adjustedNodeIds]));
	recalculateEdgeAmounts(profile, factory);
}

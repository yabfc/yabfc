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

const MAX_PROPAGATION_PASSES = 100;
const PROPAGATION_ACCURACY = 1e-9;

function getPropagationState(factory: Factory): string {
	return JSON.stringify({
		inputs: Object.entries(factory.inputs)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([id, input]) => [id, input.amount]),
		outputs: Object.entries(factory.outputs)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([id, output]) => [id, output.amount]),
		machines: Object.values(factory.recipeNodes)
			.sort((a, b) => a.id.localeCompare(b.id))
			.map(node => [node.id, node.machines.map(config => [config.id, config.machineCount])]),
	});
}

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

function getActualIncomingAmount(factory: Factory, nodeId: string, itemId: string): number {
	return factory.edges
		.filter(edge => edge.to === nodeId && edge.itemId === itemId)
		.reduce((sum, edge) => sum + edge.actualAmount, 0);
}

function getOutputNodeDemand(factory: Factory, lookup: EdgeLookup, nodeId: string, itemId: string) {
	return (lookup.outgoing.get(nodeId) ?? [])
		.filter(edge => edge.itemId === itemId && factory.outputs[edge.to])
		.reduce((sum, edge) => sum + (factory.outputs[edge.to]?.amount ?? 0), 0);
}

function isSingleOutputProducer(profile: Profile, node: RecipeNode, itemId: string): boolean {
	const outputs = profile.getRecipeById(node.recipeId)?.out ?? [];
	return outputs.length === 1 && outputs[0].id === itemId;
}

function getAvailableRecipeOutput(
	profile: Profile,
	factory: Factory,
	lookup: EdgeLookup,
	node: RecipeNode,
	itemId: string,
): number {
	const outputAmount = getNodeItemAmount(profile, node, itemId, 'output');
	const outputDemand = getOutputNodeDemand(factory, lookup, node.id, itemId);

	return Math.max(outputAmount - outputDemand, 0);
}

function isLeftPropagationSatisfied(profile: Profile, factory: Factory, nodeId: string): boolean {
	const output = factory.outputs[nodeId];
	if (output) {
		return (
			getActualIncomingAmount(factory, nodeId, output.id) + PROPAGATION_ACCURACY >=
			output.amount
		);
	}

	const node = factory.recipeNodes[nodeId];
	if (!node) return true;

	return Object.entries(calculateInput(profile, node)).every(([itemId, amount]) => {
		return getActualIncomingAmount(factory, nodeId, itemId) + PROPAGATION_ACCURACY >= amount;
	});
}

function scaleNodeToItemAmount(
	profile: Profile,
	node: RecipeNode,
	itemId: string,
	amount: number,
	side: 'input' | 'output',
): void {
	const targetAmount = Math.max(amount, 0);
	const currentAmount = getNodeItemAmount(profile, node, itemId, side);
	if (targetAmount <= PROPAGATION_ACCURACY) {
		return;
	}

	if (currentAmount <= PROPAGATION_ACCURACY) {
		for (const config of node.machines) {
			const probeNode = {
				...node,
				machines: node.machines.map(machineConfig => ({
					...machineConfig,
					machineCount: machineConfig === config ? 1 : 0,
				})),
			};
			const singleMachineAmount = getNodeItemAmount(profile, probeNode, itemId, side);
			if (singleMachineAmount <= PROPAGATION_ACCURACY) continue;

			for (const machineConfig of node.machines) {
				machineConfig.machineCount =
					machineConfig === config ? Math.ceil(targetAmount / singleMachineAmount) : 0;
			}
			return;
		}
		return;
	}

	const scale = targetAmount / currentAmount;

	for (const config of node.machines) {
		if (config.machineCount <= 0) continue;
		config.machineCount = Math.max(1, Math.ceil(config.machineCount * scale));
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
	producerNode: RecipeNode,
	itemId: string,
	externalDemand: number,
): number {
	const requiredIncomingAmounts = calculateRequiredIncomingEdgeAmounts(
		createEdgeAmountContext(profile, factory),
	);

	let downstreamDemand = externalDemand;
	let selfDemand = 0;

	for (const edge of lookup.outgoing.get(producerNode.id) ?? []) {
		if (edge.itemId !== itemId || !factory.recipeNodes[edge.to]) continue;

		const amount = requiredIncomingAmounts.get(edge) ?? 0;
		if (edge.to === producerNode.id) {
			selfDemand += amount;
		} else {
			downstreamDemand += amount;
		}
	}

	if (selfDemand <= 0) return downstreamDemand;
	if (downstreamDemand <= 0) return 0;

	const currentOutput = getNodeItemAmount(profile, producerNode, itemId, 'output');
	const recyclableOutput = currentOutput - selfDemand;
	if (recyclableOutput <= 0) return 0;

	// Positive-net recycle recipes need to be sized by their net output, not gross output.
	return (downstreamDemand * currentOutput) / recyclableOutput;
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

/** Assigns missing demand to single-output producers after using byproduct supply. */
function getSingleOutputProducerDemands(
	profile: Profile,
	factory: Factory,
	lookup: EdgeLookup,
	producerEdges: Edge[],
	itemId: string,
	requiredAmount: number,
): Map<Edge, number> | undefined {
	const singleOutputEdges = producerEdges.filter(edge => {
		const producerNode = factory.recipeNodes[edge.from];
		return producerNode && isSingleOutputProducer(profile, producerNode, itemId);
	});

	if (singleOutputEdges.length === 0 || singleOutputEdges.length === producerEdges.length) {
		return;
	}

	const byproductEdges = producerEdges.filter(edge => !singleOutputEdges.includes(edge));
	const byproductSupply = byproductEdges.reduce((sum, edge) => {
		const producerNode = factory.recipeNodes[edge.from];
		if (!producerNode) return sum;

		return sum + getAvailableRecipeOutput(profile, factory, lookup, producerNode, itemId);
	}, 0);
	const remainingDemand = Math.max(requiredAmount - byproductSupply, 0);
	const demands = new Map<Edge, number>();

	for (const edge of byproductEdges) {
		demands.set(edge, 0);
	}

	for (const { entry, amount } of distributeAmount(remainingDemand, singleOutputEdges, edge => {
		const producerNode = factory.recipeNodes[edge.from];
		return producerNode ? getNodeItemAmount(profile, producerNode, itemId, 'output') : 0;
	})) {
		demands.set(entry, amount);
	}

	return demands;
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
		const pathProducerEdges = producerEdges.filter(edge => nextPath.has(edge.from));
		const nonPathProducerEdges = producerEdges.filter(edge => !nextPath.has(edge.from));
		const singleOutputProducerDemands = getSingleOutputProducerDemands(
			profile,
			factory,
			lookup,
			producerEdges,
			itemId,
			requiredAmount,
		);

		if (producerEdges.length === 0) {
			increaseInputNodes(factory, inputEdges, requiredAmount);
			continue;
		}

		const pathProducerSupply = pathProducerEdges.reduce((sum, edge) => {
			const producerNode = factory.recipeNodes[edge.from];
			if (!producerNode) return sum;

			const outputAmount = getNodeItemAmount(profile, producerNode, itemId, 'output');
			const outputDemand = getOutputNodeDemand(factory, lookup, producerNode.id, itemId);

			return sum + Math.max(outputAmount - outputDemand, 0);
		}, 0);
		const nonPathDemand =
			pathProducerEdges.length > 0 ? Math.max(requiredAmount - pathProducerSupply, 0) : 0;
		const nonPathDemandShares = new Map(
			distributeAmount(nonPathDemand, nonPathProducerEdges, edge => {
				const producerNode = factory.recipeNodes[edge.from];
				if (!producerNode) return 0;

				return getNodeItemAmount(profile, producerNode, itemId, 'output');
			}).map(({ entry, amount }) => [entry, amount]),
		);

		for (const edge of producerEdges) {
			const producerNode = factory.recipeNodes[edge.from];
			if (!producerNode || options.blockedNodeId === producerNode.id) continue;

			const singleOutputDemand = singleOutputProducerDemands?.get(edge);
			if (singleOutputDemand === 0) continue;

			const externalDemand = factory.outputs[currentNodeId] ? requiredAmount : 0;
			const demand = getTotalProducerDemand(
				profile,
				factory,
				lookup,
				producerNode,
				itemId,
				externalDemand,
			);
			const targetDemand = singleOutputDemand ?? demand;

			scaleNodeToItemAmount(
				profile,
				producerNode,
				itemId,
				Math.max(targetDemand, nonPathDemandShares.get(edge) ?? 0),
				'output',
			);
			if (nextPath.has(producerNode.id)) continue;

			propagateLeftFromNode(profile, factory, lookup, producerNode.id, nextPath, options);
		}
	}
}

function propagateLeftUntilStable(
	profile: Profile,
	factory: Factory,
	lookup: EdgeLookup,
	nodeId: string,
	options: LeftPropagationOptions = {},
): void {
	recalculateEdgeAmounts(profile, factory);

	// rerun this propagation so e.g kovarex actually works
	for (let i = 0; i < MAX_PROPAGATION_PASSES; i++) {
		const before = getPropagationState(factory);

		propagateLeftFromNode(profile, factory, lookup, nodeId, new Set<string>(), options);
		recalculateEdgeAmounts(profile, factory);

		if (isLeftPropagationSatisfied(profile, factory, nodeId)) return;
		if (getPropagationState(factory) === before) return;
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
		propagateLeftUntilStable(profile, factory, lookup, nodeId);
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

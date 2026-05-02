import {
	fromEdgeKey,
	toEdgeKey,
	type Edge,
	type EdgeDemand,
	type Factory,
	type ItemIo,
	type RecipeNode,
	type RecipeNodeEdgeAmounts,
} from '@/lib/models/factory';
import type Profile from '@/lib/models/profile';
import { calculateInput, calculateOutput } from '@/lib/factory/factory';

type EdgeAmountMode = 'actual' | 'required';

export type EdgeLookup = {
	incoming: Map<string, Edge[]>;
	outgoing: Map<string, Edge[]>;
};

export type EdgeAmountContext = {
	sourceOutputsByNode: Record<string, Record<string, number>>;
	requiredInputsByNode: Record<string, Record<string, number>>;
	edgeDemands: EdgeDemand[];
	incomingByTargetAndItem: Record<string, EdgeDemand[]>;
	recipeNodeIds: string[];
	initialSupply: Map<string, number>;
};

export function createEdgeLookup(edges: Edge[]): EdgeLookup {
	const incoming = new Map<string, Edge[]>();
	const outgoing = new Map<string, Edge[]>();

	for (const edge of edges) {
		incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge]);
		outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
	}

	return { incoming, outgoing };
}

export function calculateRecipeNodeEdgeAmounts(factory: Factory): RecipeNodeEdgeAmounts {
	const amounts: RecipeNodeEdgeAmounts = {};

	for (const node of Object.values(factory.recipeNodes)) {
		amounts[node.id] = {
			usedInputs: {},
			usedOutputs: {},
		};
	}

	for (const edge of factory.edges) {
		const targetAmounts = amounts[edge.to];
		if (targetAmounts) {
			targetAmounts.usedInputs[edge.itemId] =
				(targetAmounts.usedInputs[edge.itemId] ?? 0) + edge.actualAmount;
		}

		const sourceAmounts = amounts[edge.from];
		if (sourceAmounts) {
			sourceAmounts.usedOutputs[edge.itemId] =
				(sourceAmounts.usedOutputs[edge.itemId] ?? 0) + edge.actualAmount;
		}
	}

	return amounts;
}

/** Connects nodes with edges  */
export function connectEdges(
	profile: Profile,
	recipeNodes: RecipeNode[],
	inputs: ItemIo[],
	outputs: ItemIo[],
) {
	let edges: Edge[] = [];

	// connect inputs to recipe nodes
	inputs.forEach(input => {
		recipeNodes
			.filter(x => profile.getRecipeById(x.recipeId)?.in.some(y => y.id === input.id))
			.forEach(recipeNode => {
				// TODO if item is sent to multiple recipe nodes, amount is wrong
				edges.push({
					from: input.id,
					to: recipeNode.id,
					actualAmount: 0,
					itemId: input.id,
					kind: 'input',
				});
			});
	});

	// nodes that have the same item as in and output (e.g kovarex enriching)
	let intermediaryNodes: Record<string, string[]> = {};
	recipeNodes.forEach(outputRecipeNode => {
		const recipe = profile.getRecipeById(outputRecipeNode.recipeId);
		if (!recipe) return;
		const output = recipe.out.map(io => io.id);
		recipe.in
			.filter(io => output.includes(io.id))
			.forEach(io => {
				intermediaryNodes[io.id] ??= [];
				intermediaryNodes[io.id].push(outputRecipeNode.id);
			});
	});

	// connect recipe node outputs
	recipeNodes.forEach(outputRecipeNode => {
		const recipe = profile.getRecipeById(outputRecipeNode.recipeId);

		if (!recipe) return;

		recipe.out.forEach(output => {
			const currentIntermediaries = intermediaryNodes[output.id] ?? [];
			const producerIsIntermediary = currentIntermediaries.includes(outputRecipeNode.id);

			recipeNodes
				.filter(node => {
					if (!profile.getRecipeById(node.recipeId)?.in.some(y => y.id === output.id))
						return false;
					if (currentIntermediaries.length > 0) {
						const nodeIsIntermediary = currentIntermediaries.includes(node.id);
						// intermediary node is allowed to selfloop
						if (producerIsIntermediary) {
							return !nodeIsIntermediary || node.id === outputRecipeNode.id;
						}
						return nodeIsIntermediary;
					}
					return true;
				})
				.forEach(inputNode => {
					edges.push({
						from: outputRecipeNode.id,
						to: inputNode.id,
						actualAmount: 0,
						itemId: output.id,
						kind: 'recipe',
					});
				});

			outputs
				.filter(outputNode => {
					if (outputNode.id !== output.id) return false;
					// only let the intermediary node connect to the output
					if (currentIntermediaries.length > 0) {
						return producerIsIntermediary;
					}
					return true;
				})
				.forEach(outputNode => {
					edges.push({
						from: outputRecipeNode.id,
						to: outputNode.id,
						actualAmount: 0,
						itemId: output.id,
						kind: 'output',
					});
				});
		});
	});

	return edges;
}

function getEdgeMaxAmount(edge: Edge): number {
	return edge.maxAmount === undefined ? Number.POSITIVE_INFINITY : edge.maxAmount;
}

function createInitialSupply(
	factory: Factory,
	edgeDemands: EdgeDemand[],
	sourceOutputsByNode: Record<string, Record<string, number>>,
	outputRatios: Record<string, number> = {},
): Map<string, number> {
	const initialSupply = new Map<string, number>();

	edgeDemands.forEach(demand => {
		const key = fromEdgeKey(demand.edge);
		if (initialSupply.has(key)) return;

		if (demand.edge.kind === 'input') {
			initialSupply.set(key, factory.inputs[demand.edge.from]?.amount ?? 0);
			return;
		}

		const outputRatio = outputRatios[demand.edge.from] ?? 1;
		const maxOutput = sourceOutputsByNode[demand.edge.from]?.[demand.edge.itemId] ?? 0;
		initialSupply.set(key, maxOutput * outputRatio);
	});

	return initialSupply;
}

function getRecipeOutputRatios(
	sourceOutputsByNode: Record<string, Record<string, number>>,
	requiredInputsByNode: Record<string, Record<string, number>>,
	recipeNodeIds: string[],
	amounts: Map<Edge, number>,
): Record<string, number> {
	const actualInputsByNode: Record<string, Record<string, number>> = {};
	const actualOutputsByNode: Record<string, Record<string, number>> = {};

	for (const nodeId of recipeNodeIds) {
		actualInputsByNode[nodeId] = {};
		actualOutputsByNode[nodeId] = {};
	}

	for (const [edge, amount] of amounts) {
		if (edge.kind !== 'output') {
			const actualInputs = actualInputsByNode[edge.to];
			if (actualInputs) {
				actualInputs[edge.itemId] = (actualInputs[edge.itemId] ?? 0) + amount;
			}
		}

		if (edge.kind !== 'input') {
			const actualOutputs = actualOutputsByNode[edge.from];
			if (actualOutputs) {
				actualOutputs[edge.itemId] = (actualOutputs[edge.itemId] ?? 0) + amount;
			}
		}
	}

	const outputRatios: Record<string, number> = {};
	for (const nodeId of recipeNodeIds) {
		const requiredInputs = Object.entries(requiredInputsByNode[nodeId] ?? {}).filter(
			([, amount]) => amount > 0,
		);

		const actualInputs = actualInputsByNode[nodeId] ?? {};
		const inputRatio =
			requiredInputs.length === 0
				? 1
				: requiredInputs.reduce((ratio, [itemId, requiredAmount]) => {
						return Math.min(ratio, (actualInputs[itemId] ?? 0) / requiredAmount);
					}, 1);
		const outputRatio = Object.entries(sourceOutputsByNode[nodeId] ?? {}).reduce(
			(ratio, [itemId, outputAmount]) => {
				if (outputAmount <= 0) return ratio;
				return Math.max(ratio, (actualOutputsByNode[nodeId]?.[itemId] ?? 0) / outputAmount);
			},
			0,
		);

		outputRatios[nodeId] = Math.min(inputRatio, outputRatio, 1);
	}

	return outputRatios;
}

function limitRecipeDemandRatios(
	recipeNodeIds: string[],
	recipeDemandRatios: Record<string, number>,
	outputRatios: Record<string, number>,
): Map<string, number> {
	const limitedRatios = new Map<string, number>();

	for (const nodeId of recipeNodeIds) {
		limitedRatios.set(
			nodeId,
			Math.min(recipeDemandRatios[nodeId] ?? 0, outputRatios[nodeId] ?? 1),
		);
	}

	return limitedRatios;
}

function getRequiredOutputAmounts(
	edgeDemands: EdgeDemand[],
	requiredIncomingAmounts: Map<Edge, number>,
): Map<string, number> {
	const requiredOutputAmounts = new Map<string, number>();

	for (const { edge, demand } of edgeDemands) {
		if (!(edge.kind !== 'input')) continue;

		const amount = edge.kind !== 'output' ? (requiredIncomingAmounts.get(edge) ?? 0) : demand;
		const key = fromEdgeKey(edge);

		requiredOutputAmounts.set(key, (requiredOutputAmounts.get(key) ?? 0) + amount);
	}

	return requiredOutputAmounts;
}

function getRecipeDemandRatios(
	recipeNodeIds: string[],
	sourceOutputsByNode: Record<string, Record<string, number>>,
	requiredOutputAmounts: Map<string, number>,
): Record<string, number> {
	const demandRatios: Record<string, number> = {};

	for (const nodeId of recipeNodeIds) {
		let ratio = 0;

		for (const [itemId, outputAmount] of Object.entries(sourceOutputsByNode[nodeId] ?? {})) {
			if (outputAmount <= 0) continue;

			const outputDemand = requiredOutputAmounts.get(`${nodeId}-${itemId}`) ?? 0;
			ratio = Math.max(ratio, Math.min(outputDemand / outputAmount, 1));
		}

		demandRatios[nodeId] = ratio;
	}

	return demandRatios;
}

function createTargetDemandMap(
	incomingByTargetAndItem: Record<string, EdgeDemand[]>,
	recipeDemandRatios: Map<string, number>,
	potentialSupply: Map<string, number>,
): Map<string, number> {
	const demandByTargetAndItem = new Map<string, number>();
	const availableByTargetAndItem = new Map<string, number>();
	const targetItemsByNode = new Map<string, Set<string>>();

	for (const entries of Object.values(incomingByTargetAndItem)) {
		if (entries.length === 0) continue;

		const { edge, demand } = entries[0];
		const key = toEdgeKey(edge);
		const targetItems = targetItemsByNode.get(edge.to) ?? new Set<string>();

		targetItems.add(key);
		targetItemsByNode.set(edge.to, targetItems);
		demandByTargetAndItem.set(key, demand * (recipeDemandRatios.get(edge.to) ?? 1));
		availableByTargetAndItem.set(
			key,
			entries.reduce((sum, { edge }) => {
				const available = potentialSupply.get(fromEdgeKey(edge)) ?? 0;
				return sum + Math.min(available, getEdgeMaxAmount(edge));
			}, 0),
		);
	}

	for (const [nodeId, itemKeys] of targetItemsByNode) {
		for (const key of itemKeys) {
			const demand = demandByTargetAndItem.get(key) ?? 0;
			let ratioFromOtherInputs = 1;

			for (const otherKey of itemKeys) {
				if (otherKey === key) continue;

				const otherDemand = demandByTargetAndItem.get(otherKey) ?? 0;
				if (otherDemand <= 0) continue;

				ratioFromOtherInputs = Math.min(
					ratioFromOtherInputs,
					(availableByTargetAndItem.get(otherKey) ?? 0) / otherDemand,
				);
			}

			demandByTargetAndItem.set(key, demand * Math.min(Math.max(ratioFromOtherInputs, 0), 1));
		}

		if ((recipeDemandRatios.get(nodeId) ?? 0) <= 0) {
			for (const key of itemKeys) {
				demandByTargetAndItem.set(key, 0);
			}
		}
	}

	return demandByTargetAndItem;
}

function allocateEntriesBySource(
	entries: EdgeDemand[],
	targetDemand: Map<string, number>,
	remainingSupply: Map<string, number>,
	actualAmounts: Map<Edge, number>,
): void {
	const entriesBySource = entries.reduce<Record<string, EdgeDemand[]>>((acc, entry) => {
		const key = fromEdgeKey(entry.edge);
		(acc[key] ??= []).push(entry);
		return acc;
	}, {});

	for (const [sourceKey, sourceEntries] of Object.entries(entriesBySource)) {
		let sourceRemaining = remainingSupply.get(sourceKey) ?? 0;
		let activeEntries = sourceEntries.filter(({ edge }) => {
			const targetRemaining = targetDemand.get(toEdgeKey(edge)) ?? 0;
			return targetRemaining > 0 && getEdgeMaxAmount(edge) > 0;
		});

		while (sourceRemaining > 0 && activeEntries.length > 0) {
			const totalDemand = activeEntries.reduce((sum, { edge }) => {
				return sum + (targetDemand.get(toEdgeKey(edge)) ?? 0);
			}, 0);
			if (totalDemand <= 0) break;

			let usedInPass = 0;

			for (const { edge } of activeEntries) {
				const targetKey = toEdgeKey(edge);
				const targetRemaining = targetDemand.get(targetKey) ?? 0;
				const currentAmount = actualAmounts.get(edge) ?? 0;
				const edgeRemaining = getEdgeMaxAmount(edge) - currentAmount;
				if (targetRemaining <= 0 || edgeRemaining <= 0) continue;

				const share = sourceRemaining * (targetRemaining / totalDemand);
				const used = Math.min(share, targetRemaining, edgeRemaining);

				actualAmounts.set(edge, currentAmount + used);
				targetDemand.set(targetKey, targetRemaining - used);
				usedInPass += used;
			}

			if (usedInPass <= 0) break;

			sourceRemaining -= usedInPass;
			activeEntries = activeEntries.filter(({ edge }) => {
				const targetRemaining = targetDemand.get(toEdgeKey(edge)) ?? 0;
				const currentAmount = actualAmounts.get(edge) ?? 0;
				return targetRemaining > 0 && currentAmount < getEdgeMaxAmount(edge);
			});
		}

		remainingSupply.set(sourceKey, sourceRemaining);
	}
}

function allocateActualIncomingEdgeAmounts(
	incomingByTargetAndItem: Record<string, EdgeDemand[]>,
	remainingSupply: Map<string, number>,
	targetDemands: Map<string, number>,
): Map<Edge, number> {
	const actualAmounts = new Map<Edge, number>();
	const entriesByItem = Object.values(incomingByTargetAndItem)
		.flat()
		.reduce<Record<string, EdgeDemand[]>>((acc, entry) => {
			(acc[entry.edge.itemId] ??= []).push(entry);
			return acc;
		}, {});

	for (const entries of Object.values(entriesByItem)) {
		const targetDemand = new Map<string, number>();

		for (const { edge, demand } of entries) {
			const key = toEdgeKey(edge);
			targetDemand.set(key, targetDemands.get(key) ?? demand);
		}

		const inputEntries = entries.filter(({ edge }) => !(edge.kind !== 'input'));
		const recipeEntries = entries.filter(({ edge }) => edge.kind !== 'input');

		allocateEntriesBySource(inputEntries, targetDemand, remainingSupply, actualAmounts);
		allocateEntriesBySource(recipeEntries, targetDemand, remainingSupply, actualAmounts);

		for (const { edge } of entries) {
			if (!actualAmounts.has(edge)) actualAmounts.set(edge, 0);
		}
	}

	return actualAmounts;
}

/** Allocate amounts for incoming edges, grouped by target and item. */
function allocateIncomingEdgeAmounts(
	incomingByTargetAndItem: Record<string, EdgeDemand[]>,
	remainingSupply: Map<string, number>,
	mode: EdgeAmountMode = 'actual',
	targetDemands = new Map<string, number>(),
): Map<Edge, number> {
	if (mode === 'actual') {
		return allocateActualIncomingEdgeAmounts(
			incomingByTargetAndItem,
			remainingSupply,
			targetDemands,
		);
	}

	const actualAmounts = new Map<Edge, number>();

	Object.values(incomingByTargetAndItem).forEach(entries => {
		if (entries.length === 0) return;

		const totalDemand = entries[0].demand;
		let remainingDemand = totalDemand;

		const inputEntries = entries.filter(({ edge }) => !(edge.kind !== 'input'));
		const recipeEntries = entries.filter(({ edge }) => edge.kind !== 'input');

		// consume input supply first
		for (const { edge } of inputEntries) {
			const key = fromEdgeKey(edge);
			const available = remainingSupply.get(key) ?? 0;

			const used = Math.min(available, remainingDemand, getEdgeMaxAmount(edge));
			actualAmounts.set(edge, used);
			remainingSupply.set(key, available - used);

			remainingDemand -= used;
		}

		// use remaining supply from recipe nodes
		if (remainingDemand > 0 && recipeEntries.length > 0) {
			const totalRecipeAvailable = recipeEntries.reduce((sum, { edge }) => {
				return sum + (remainingSupply.get(fromEdgeKey(edge)) ?? 0);
			}, 0);

			if (totalRecipeAvailable <= 0) {
				for (const { edge } of recipeEntries) {
					const used = Math.min(
						remainingDemand / recipeEntries.length,
						getEdgeMaxAmount(edge),
					);
					actualAmounts.set(edge, used);
				}
			} else {
				for (const { edge } of recipeEntries) {
					const key = fromEdgeKey(edge);
					const available = remainingSupply.get(key) ?? 0;

					const share = remainingDemand * (available / totalRecipeAvailable);
					const used = Math.min(share, getEdgeMaxAmount(edge));

					actualAmounts.set(edge, used);
				}
			}
		} else {
			for (const { edge } of recipeEntries) {
				if (actualAmounts.has(edge)) continue;
				const used =
					remainingDemand > 0 && recipeEntries.length > 0
						? Math.min(remainingDemand / recipeEntries.length, getEdgeMaxAmount(edge))
						: 0;
				actualAmounts.set(edge, used);
			}
		}
	});
	return actualAmounts;
}

/** Allocates amounts for edges that go to output nodes */
function allocateOutputEdgeAmounts(
	edgeDemands: EdgeDemand[],
	remainingSupply: Map<string, number>,
	amounts: Map<Edge, number>,
) {
	edgeDemands.forEach(({ edge, demand }) => {
		if (edge.kind !== 'output') return;

		const key = fromEdgeKey(edge);
		const available = remainingSupply.get(key) ?? 0;
		const used = Math.min(available, demand, getEdgeMaxAmount(edge));

		amounts.set(edge, used);
		remainingSupply.set(key, available - used);
	});
}

export function createEdgeAmountContext(profile: Profile, factory: Factory): EdgeAmountContext {
	const sourceOutputsByNode: Record<string, Record<string, number>> = {};
	const requiredInputsByNode: Record<string, Record<string, number>> = {};

	Object.values(factory.recipeNodes).forEach(node => {
		sourceOutputsByNode[node.id] = calculateOutput(profile, node);
		requiredInputsByNode[node.id] = calculateInput(profile, node);
	});

	// calculate demand per edge
	const edgeDemands = factory.edges.map(edge => {
		if (edge.kind === 'output') {
			const outputDemand = factory.outputs[edge.to]?.amount ?? 0;
			const sourceCapacity = sourceOutputsByNode[edge.from]?.[edge.itemId] ?? 0;

			return {
				edge,
				demand: Math.max(outputDemand, sourceCapacity),
			};
		}

		return {
			edge,
			demand: requiredInputsByNode[edge.to]?.[edge.itemId] ?? 0,
		};
	});

	const initialSupply = createInitialSupply(factory, edgeDemands, sourceOutputsByNode);

	// group incoming edges by target & item
	const incomingByTargetAndItem = edgeDemands.reduce<Record<string, EdgeDemand[]>>(
		(acc, entry) => {
			if (entry.edge.kind === 'output') return acc;

			const key = toEdgeKey(entry.edge);
			(acc[key] ??= []).push(entry);
			return acc;
		},
		{},
	);

	const recipeNodeIds = Object.keys(factory.recipeNodes);

	return {
		sourceOutputsByNode,
		requiredInputsByNode,
		edgeDemands,
		incomingByTargetAndItem,
		recipeNodeIds,
		initialSupply,
	};
}

export function calculateRequiredIncomingEdgeAmounts(
	context: EdgeAmountContext,
): Map<Edge, number> {
	return allocateIncomingEdgeAmounts(
		context.incomingByTargetAndItem,
		new Map(context.initialSupply),
		'required',
	);
}

export function calculateEdgeAmounts(profile: Profile, factory: Factory): Map<Edge, number> {
	const context = createEdgeAmountContext(profile, factory);
	const requiredIncomingAmounts = calculateRequiredIncomingEdgeAmounts(context);
	const requiredOutputAmounts = getRequiredOutputAmounts(
		context.edgeDemands,
		requiredIncomingAmounts,
	);
	const recipeDemandRatios = getRecipeDemandRatios(
		context.recipeNodeIds,
		context.sourceOutputsByNode,
		requiredOutputAmounts,
	);
	let amounts = new Map<Edge, number>();
	let outputRatios: Record<string, number> = {};

	// make sure that reduced amounts cascade correctly through all nodes
	for (let i = 0; i < context.recipeNodeIds.length + 1; i++) {
		const remainingSupply = createInitialSupply(
			factory,
			context.edgeDemands,
			context.sourceOutputsByNode,
			outputRatios,
		);
		const targetDemands = createTargetDemandMap(
			context.incomingByTargetAndItem,
			limitRecipeDemandRatios(context.recipeNodeIds, recipeDemandRatios, outputRatios),
			remainingSupply,
		);

		amounts = allocateIncomingEdgeAmounts(
			context.incomingByTargetAndItem,
			remainingSupply,
			'actual',
			targetDemands,
		);
		allocateOutputEdgeAmounts(context.edgeDemands, remainingSupply, amounts);
		outputRatios = getRecipeOutputRatios(
			context.sourceOutputsByNode,
			context.requiredInputsByNode,
			context.recipeNodeIds,
			amounts,
		);
	}

	return amounts;
}

export function recalculateEdgeAmounts(profile: Profile, factory: Factory) {
	const amounts = calculateEdgeAmounts(profile, factory);

	for (const edge of factory.edges) {
		edge.actualAmount = amounts.get(edge) ?? 0;
	}
	factory.edges = [...factory.edges];
}

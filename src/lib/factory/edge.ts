import {
	fromEdgeKey,
	toEdgeKey,
	type Edge,
	type EdgeDemand,
	type Factory,
	type ItemIo,
	type RecipeNode,
} from '@/lib/models/factory';
import type Profile from '@/lib/models/profile';
import { calculateInput, calculateOutput } from '@/lib/factory/factory';

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
					actualAmount: input.amount,
					targetAmount: input.amount,
					itemId: input.id,
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
						targetAmount: 0,
						itemId: output.id,
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
						targetAmount: 0,
						itemId: output.id,
					});
				});
		});
	});

	return edges;
}

/** Allocate amounts for incoming edges, grouped by target and item. */
function allocateIncomingEdgeAmounts(
	incomingByTargetAndItem: Record<string, EdgeDemand[]>,
	recipeNodeIds: string[],
	remainingSupply: Map<string, number>,
): Map<Edge, number> {
	const actualAmounts = new Map<Edge, number>();

	Object.values(incomingByTargetAndItem).forEach(entries => {
		if (entries.length === 0) return;

		const totalDemand = entries[0].demand;
		let remainingDemand = totalDemand;

		const inputEntries = entries.filter(({ edge }) => !recipeNodeIds.includes(edge.from));
		const recipeEntries = entries.filter(({ edge }) => recipeNodeIds.includes(edge.from));

		// consume input supply first
		for (const { edge } of inputEntries) {
			const key = fromEdgeKey(edge);
			const available = remainingSupply.get(key) ?? 0;

			const used = Math.min(available, remainingDemand);
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
					actualAmounts.set(edge, 0);
				}
			} else {
				for (const { edge } of recipeEntries) {
					const key = fromEdgeKey(edge);
					const available = remainingSupply.get(key) ?? 0;

					const share = remainingDemand * (available / totalRecipeAvailable);
					const used = Math.min(available, share);

					actualAmounts.set(edge, used);
					remainingSupply.set(key, available - used);
				}
			}
		} else {
			for (const { edge } of recipeEntries) {
				if (!actualAmounts.has(edge)) actualAmounts.set(edge, 0);
			}
		}
	});
	return actualAmounts;
}

/** Allocates amounts for edges that go to output nodes */
function allocateOutputEdgeAmounts(
	edgeDemands: EdgeDemand[],
	recipeNodeIds: string[],
	remainingSupply: Map<string, number>,
	amounts: Map<Edge, number>,
) {
	edgeDemands.forEach(({ edge, demand }) => {
		if (recipeNodeIds.includes(edge.to)) return;

		const key = fromEdgeKey(edge);
		const available = remainingSupply.get(key) ?? 0;
		const used = Math.min(available, demand);

		amounts.set(edge, used);
		remainingSupply.set(key, available - used);
	});
}

export function recalculateEdgeAmounts(profile: Profile, factory: Factory) {
	const sourceOutputsByNode: Record<string, Record<string, number>> = {};
	const targetInputsByNode: Record<string, Record<string, number>> = {};

	Object.values(factory.recipeNodes).forEach(node => {
		sourceOutputsByNode[node.id] = calculateOutput(profile, node);
		targetInputsByNode[node.id] = calculateInput(profile, node);
	});

	// calculate demand per edge
	const edgeDemands = factory.edges.map(edge => {
		const sourceNode = factory.recipeNodes[edge.from];
		const targetNode = factory.recipeNodes[edge.to];

		// input/recipe node -> recipe node
		if (targetNode) {
			return {
				edge,
				demand: targetInputsByNode[targetNode.id]?.[edge.itemId] ?? 0,
			};
		}

		// recipe node -> output node
		if (sourceNode && !targetNode) {
			return {
				edge,
				demand: sourceOutputsByNode[sourceNode.id]?.[edge.itemId] ?? 0,
			};
		}

		return {
			edge,
			demand: 0,
		};
	});

	function getInitialEdgeSupply(edge: Edge): number {
		const sourceNode = factory.recipeNodes[edge.from];
		// input node
		if (!sourceNode) return factory.inputs[edge.from]?.amount ?? 0;
		// recipe node output
		return sourceOutputsByNode[sourceNode.id]?.[edge.itemId] ?? 0;
	}

	// remaining available supply by source & item
	const remainingSupply = new Map<string, number>();
	edgeDemands.forEach(demand => {
		const key = fromEdgeKey(demand.edge);
		if (!remainingSupply.has(key)) {
			remainingSupply.set(key, getInitialEdgeSupply(demand.edge));
		}
	});

	// group incoming edges by target & item
	const incomingByTargetAndItem = edgeDemands.reduce<Record<string, EdgeDemand[]>>(
		(acc, entry) => {
			const targetNode = factory.recipeNodes[entry.edge.to];
			if (!targetNode) return acc;

			const key = toEdgeKey(entry.edge);
			(acc[key] ??= []).push(entry);
			return acc;
		},
		{},
	);

	const recipeNodeIds = Object.keys(factory.recipeNodes);
	const amounts = allocateIncomingEdgeAmounts(
		incomingByTargetAndItem,
		recipeNodeIds,
		remainingSupply,
	);

	allocateOutputEdgeAmounts(edgeDemands, recipeNodeIds, remainingSupply, amounts);

	factory.edges = factory.edges.map(edge => ({
		...edge,
		actualAmount: amounts.get(edge) ?? 0,
	}));
}

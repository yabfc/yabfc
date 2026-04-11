import {
	fromEdgeKey,
	toEdgeKey,
	type Edge,
	type EdgeDemand,
	type Factory,
} from '@/lib/models/factory';
import type Profile from '@/lib/models/profile';
import { calculateInput, calculateOutput } from './factory';

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

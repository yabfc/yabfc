import { type MachineConfiguration } from '@/lib/models/machine';
import { type RecipeVariant } from '@/lib/models/recipe';
import { nanoid } from 'nanoid';

interface VisualRepresentation {
	nodes: RecipeNode[];
	edges: RecipeEdge[];
}

interface RecipeNode {
	id: string;
	recipeId: string;
	machines: MachineConfiguration[];
}

export interface RecipeEdge {
	from: string;
	to: string;
	itemId: string;
	amount: number;
}

function generateNodes(usedVariants: RecipeVariant[]): VisualRepresentation {
	// cluster the variants first to each recipe. So e.g two different
	// machine configs for the same recipe end up in the same node later
	let nodeMap: Record<string, RecipeNode> = {};

	usedVariants.forEach(variant => {
		nodeMap[variant.recipeId] ??= {
			id: nanoid(),
			recipeId: variant.recipeId,
			machines: [],
		};
		nodeMap[variant.recipeId].machines.push({
			id: variant.machineId,
			machineId: variant.machineId,
			usedEffects: variant.usedEffectModuleIds,
			amount: variant.amount!,
			requiredPower: variant.requiredPower,
		});
	});

	const supplyMap: Record<string, { recipeId: string; amount: number }[]> = {};
	const demandMap: Record<string, { recipeId: string; amount: number }[]> = {};
	usedVariants.forEach(variant => {
		variant.in.forEach(io => {
			if (!demandMap[io.id]) demandMap[io.id] = [];
			demandMap[io.id].push({
				recipeId: variant.recipeId,
				amount: io.amount * variant.amount!,
			});
		});
		variant.out.forEach(io => {
			if (!supplyMap[io.id]) supplyMap[io.id] = [];
			supplyMap[io.id].push({
				recipeId: variant.recipeId,
				amount: io.amount * variant.amount!,
			});
		});
	});

	let edgeMap: Record<string, RecipeEdge[]> = {};

	Object.entries(demandMap).forEach(([itemId, consumers]) => {
		const producers = [...(supplyMap[itemId] || [])];

		consumers.forEach(consumer => {
			let needed = consumer.amount;

			while (needed > 0 && producers.length > 0) {
				const producer = producers[0];
				const take = Math.min(needed, producer.amount);

				if (take > 0) {
					const producerId = nodeMap[producer.recipeId].id;
					const consumerId = nodeMap[consumer.recipeId].id;
					if (!edgeMap[producer.recipeId]) edgeMap[producer.recipeId] = [];
					const existing = edgeMap[producer.recipeId].find(
						e => e.from === producerId && e.to === consumerId && e.itemId === itemId,
					);
					if (existing) existing.amount += take;
					else
						edgeMap[producer.recipeId].push({
							from: producerId,
							to: consumerId,
							itemId,
							amount: take,
						});

					needed -= take;
					producer.amount -= take;
				}

				if (producer.amount <= 0) {
					producers.shift();
				}
			}
		});
	});

	return { nodes: Object.values(nodeMap), edges: Object.values(edgeMap).flat() };
}

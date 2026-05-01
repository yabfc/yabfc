import type { EffectChoice } from '@/lib/models/effect';

export interface MachineConfiguration {
	id: string;
	machineId: string;
	machineCount: number;
	productivityOverride: number;
	speedOverride: number;
	speed: number;
	productivity: number;
	effects: EffectChoice[];
}

export interface RecipeNode {
	id: string;
	recipeId: string;
	machines: MachineConfiguration[];
}

export type RecipeNodeData = Record<string, unknown> & {
	recipeNode: RecipeNode;
	usedInputs: { [key: string]: number };
	usedOutputs: { [key: string]: number };
	onRecipeChange: (nodeId: string, recipeId: string) => void;
	onEditMachineConfig: (config: MachineConfiguration) => void;
};

export type RecipeNodeEdgeAmounts = Record<
	string,
	{
		usedInputs: Record<string, number>;
		usedOutputs: Record<string, number>;
	}
>;

export type ItemIoNodeData = Record<string, unknown> & {
	item: ItemIo;
	onAmountChange: (itemId: string, amount: number) => void;
};

export interface ItemIo {
	id: string;
	amount: number;
}

export interface Edge {
	from: string;
	to: string;
	actualAmount: number;
	itemId: string;
	maxAmount?: number;
}

export type EdgeData = Record<string, unknown> & {
	edge: Edge;
	onEdgeView: (edge: Edge) => void;
};

export function toEdgeKey(edge: Edge): string {
	return `${edge.to}-${edge.itemId}`;
}

export function fromEdgeKey(edge: Edge): string {
	return `${edge.from}-${edge.itemId}`;
}

export type EdgeDemand = {
	edge: Edge;
	demand: number;
};

export interface Factory {
	inputs: Record<string, ItemIo>;
	outputs: Record<string, ItemIo>;
	recipeNodes: Record<string, RecipeNode>;
	edges: Edge[];
}

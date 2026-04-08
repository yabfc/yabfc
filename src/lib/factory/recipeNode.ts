export interface MachineConfiguration {
	machineId: string;
	machineCount: number;
	productivity: number;
	speed: number;
}

export interface RecipeNode {
	id: string;
	recipeId: string;
	machines: MachineConfiguration[];
}

export type RecipeNodeData = Record<string, unknown> & {
	recipeNode: RecipeNode;
	onRecipeChange: (nodeId: string, recipeId: string) => void;
};

export interface ItemIo {
	id: string;
	amount: number;
}

export interface InputItemIo extends ItemIo {
	/** whether input is auto-added or supplied by the user */
	auto: boolean;
}

export interface Edge {
	from: string;
	to: string;
	amount: number;
}

export interface Factory {
	inputs: Record<string, InputItemIo>;
	outputs: Record<string, ItemIo>;
	recipeNodes: Record<string, RecipeNode>;
	edges: Edge[];
}

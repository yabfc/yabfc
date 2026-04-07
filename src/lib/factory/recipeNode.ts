export interface MachineConfiguration {
	machineId: string;
	machineCount: number;
	efficiency: number;
	speed: number;
}

export interface RecipeNode {
	id: string;
	recipeId: string;
	machines: MachineConfiguration[];
}

export interface ItemIo {
	id: string;
	amount: number;
}

export interface Edge {
	from: string;
	to: string;
	amount: number;
}

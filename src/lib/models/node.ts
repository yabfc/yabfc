import { type MachineConfiguration } from '@/lib/models/machine';

export interface RecipeNode {
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

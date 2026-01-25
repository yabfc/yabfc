export interface BaseItemIo {
	id: string;
	type: 'item' | 'fluid';
	amount: number;
}

export interface RecipeVariant {
	id: string;
	recipeId: string;
	recipePriority: number;
	machineId: string;
	in: BaseItemIo[];
	out: BaseItemIo[];
	requiredPower: number;
	usedEffectModuleIds: string[];
	amount: number;
}

export default interface Recipe {
	id: string;
	name?: string;
	in: BaseItemIo[];
	out: BaseItemIo[];
	duration: number;
	category: string;
}

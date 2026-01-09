export interface MachineFeature {
	id: string;
	name?: string;
	itemSlots: number;
	effectPerSlot: string[];
}

export default interface Machine {
	id: string;
	name?: string;
	available: boolean;
	recipeCategories: string[];
	requiredPower: number;
	features: MachineFeature[];
	limitations?: string[];
}

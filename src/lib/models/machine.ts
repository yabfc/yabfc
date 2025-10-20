export interface MachineEffect {
	id: string;
	name?: string;
	modifiable: boolean;
	value: number;
	powerEffect?: number;
	onlyOutputScales?: boolean;
}

export interface MachineFeature {
	id: string;
	name?: string;
	itemSlots: number;
	effectPerSlot: MachineEffect[];
}

export default interface Machine {
	id: string;
	name?: string;
	recipeCategories: string[];
	requiredPower: number;
	features: MachineFeature[];
}

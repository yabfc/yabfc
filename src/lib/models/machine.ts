export interface MachineEffect {
	id: string;
	name?: string;
	modifiable: boolean;
	value: number;
}

export interface MachineFeature {
	id: string;
	name?: string;
	effects: MachineEffect[];
}

export default interface Machine {
	id: string;
	name?: string;
	recipeCategories: string[];
	requiredPower: number;
	features: MachineFeature[];
}

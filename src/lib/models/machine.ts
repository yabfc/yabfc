export interface MachineFeatureInterface {
	id: string;
	name?: string;
	itemSlots: number;
	effectPerSlot: string[];
}

export class MachineFeature {
	id: string;
	name?: string;
	itemSlots: number;
	effectPerSlot: string[];

	constructor(feature: MachineFeatureInterface) {
		this.id = feature.id;
		this.name = feature.name;
		this.itemSlots = feature.itemSlots;
		this.effectPerSlot = feature.effectPerSlot;
	}

	getDisplayName(): string {
		return (
			this.name ??
			this.id
				.split('-')
				.map(w => w[0].toUpperCase() + w.slice(1))
				.join(' ')
		);
	}
}

export interface MachineInterface {
	id: string;
	name?: string;
	available: boolean;
	recipeCategories: string[];
	requiredPower: number;
	features: MachineFeature[];
	limitations?: string[];
}

export default class Machine {
	id: string;
	name?: string;
	available: boolean;
	recipeCategories: string[];
	requiredPower: number;
	features: MachineFeature[];
	limitations?: string[];

	constructor(machine: MachineInterface) {
		this.id = machine.id;
		this.name = machine.name;
		this.available = machine.available;
		this.recipeCategories = machine.recipeCategories;
		this.requiredPower = machine.requiredPower;
		this.features = machine.features.map(x => new MachineFeature(x));
		this.limitations = machine.limitations;
	}

	getDisplayName(): string {
		return (
			this.name ??
			this.id
				.split('-')
				.map(w => w[0].toUpperCase() + w.slice(1))
				.join(' ')
		);
	}
}

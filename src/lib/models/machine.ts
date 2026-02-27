import EffectModule, { type EffectChoice, type EffectConfiguration } from '@/lib/models/effect';

export interface MachineFeatureInterface {
	id: string;
	name?: string;
	itemSlots: number;
	effectPerSlot: string[];
	disables?: string[];
	hidden?: boolean;
}

export class MachineFeature {
	id: string;
	name?: string;
	itemSlots: number;
	effectPerSlot: string[];
	disables?: string[];
	hidden?: boolean;

	constructor(feature: MachineFeatureInterface) {
		this.id = feature.id;
		this.name = feature.name;
		this.itemSlots = feature.itemSlots;
		this.effectPerSlot = feature.effectPerSlot;
		this.disables = feature.disables;
		this.hidden = feature.hidden;
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

export interface MachineConfiguration {
	id: string;
	machineId: string;
	usedEffects: EffectConfiguration[];
	amount: number;
	requiredPower: number;
}

export interface MachineInterface {
	id: string;
	name?: string;
	available: boolean;
	recipeCategories: string[];
	requiredPower: number;
	features: MachineFeatureInterface[];
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

	getAllowedEffects(): string[] {
		return this.features.map(x => x.effectPerSlot).flat();
	}

	getAllowedEffectMoules(effects: EffectModule[]): EffectModule[] {
		const allowed = this.getAllowedEffects();
		return effects.filter(x => x.available && allowed.includes(x.id));
	}

	getBaseCraftingSpeed(effects: EffectModule[]): number {
		const speedFeature = this.features.find(x => x.id === 'crafting-speed');
		if (!speedFeature || speedFeature.itemSlots !== 0) {
			return 1;
		}
		let speed = 1;
		speedFeature.effectPerSlot.forEach(id => {
			const effect = effects.find(x => x.id === id);
			if (!effect) {
				return;
			}
			effect.modifiers.forEach(m => {
				if (m.id === 'speed' && m.value !== undefined) {
					speed *= m.value;
				}
			});
		});
		return speed;
	}

	getPowerConsumption(effects: EffectChoice[]): number {
		let power = this.requiredPower;
		effects.forEach(choice => {
			power = choice.effect.updatePowerConsumption(power, choice.scaling);
		});

		return power;
	}
}

import type EffectModule from '@/lib/models/effect';

export interface MachineFeatureInterface {
	id: string;
	name?: string;
	itemSlots: number;
	effectPerSlot: string[];
	disables?: string[];
}

export class MachineFeature {
	id: string;
	name?: string;
	itemSlots: number;
	effectPerSlot: string[];
	disables?: string[];

	constructor(feature: MachineFeatureInterface) {
		this.id = feature.id;
		this.name = feature.name;
		this.itemSlots = feature.itemSlots;
		this.effectPerSlot = feature.effectPerSlot;
		this.disables = feature.disables;
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

	getPowerConsumptionWithEffects(effects: EffectModule[], scaling: number): number {
		let power = this.requiredPower;
		effects.forEach(effect => {
			const modifiable = effect.modifiers.find(x => x.modifiable);
			effect.modifiers.forEach(modifier => {
				if (
					['consumption', 'power'].includes(modifier.id) &&
					modifier.valueScaling === 'exponential'
				) {
					if (!modifier.modifiable && modifier.value !== undefined) {
						power *= Math.pow(scaling, modifier.value);
					}
				} else if (['consumption', 'power'].includes(modifier.id) && !effect.perSlot) {
					power *= modifier.value! * scaling;
				} else if (['consumption', 'power'].includes(modifier.id)) {
					power *= modifier.value!;
				}
			});
		});
		return power;
	}
}

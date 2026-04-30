import EffectModule, { type EffectChoice } from '@/lib/models/effect';

export interface MachineFeatureInterface {
	id: string;
	name?: string;
	itemSlots: number;
	effectPerSlot: string[];
	hidden?: boolean;
	modifiable?: boolean;
}

export class MachineFeature {
	id: string;
	name?: string;
	itemSlots: number;
	effectPerSlot: string[];
	hidden?: boolean;
	modifiable?: boolean;

	constructor(feature: MachineFeatureInterface) {
		this.id = feature.id;
		this.name = feature.name;
		this.itemSlots = feature.itemSlots;
		this.effectPerSlot = feature.effectPerSlot;
		this.hidden = feature.hidden;
		this.modifiable = feature.modifiable;
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
	minPower: number | undefined;
	maxPower: number | undefined;

	constructor(machine: MachineInterface, effects: EffectModule[]) {
		this.id = machine.id;
		this.name = machine.name;
		this.available = machine.available;
		this.recipeCategories = machine.recipeCategories;
		this.requiredPower = machine.requiredPower;
		this.features = machine.features.map(x => new MachineFeature(x));
		this.limitations = machine.limitations;

		const limit = this.getModifierLimit('consumption', effects);
		if (!limit) return;
		if (limit.max) this.maxPower = limit.max * this.requiredPower;
		if (limit.min) this.minPower = limit.min * this.requiredPower;
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

	getAllowedEffectModules(effects: EffectModule[]): EffectModule[] {
		const allowed = this.getAllowedEffects();
		return effects.filter(x => x.available && allowed.includes(x.id) && !x.hidden);
	}

	getModifierLimit(
		modifierId: string,
		effects: EffectModule[],
	): { min: number | undefined; max: number | undefined } | undefined {
		const limit = this.features.find(x => x.id === 'limit');
		if (!limit) return;
		const limitEffects = effects.filter(x => limit.effectPerSlot.includes(x.id));
		const effect = limitEffects.find(effect => effect.modifiers.some(x => x.id === modifierId));
		if (!effect) return;
		return { min: effect.minValue, max: effect.maxValue };
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

	getPowerConsumption(choices: EffectChoice[], effects: EffectModule[]): number {
		let power = this.requiredPower;
		choices.forEach(choice => {
			const effect = effects.find(x => x.id === choice.effectId);
			if (!effect) return;
			power = effect.updatePowerConsumption(power, choice.scaling ?? 1);
		});
		if (this.minPower && this.minPower > power) return this.minPower;
		if (this.maxPower && this.maxPower < power) return this.maxPower;
		return power;
	}

	getQualityTiers(effects: EffectModule[]): EffectModule[] {
		const ids = this.features.find(x => x.id === 'quality-tiers')?.effectPerSlot || [];
		return effects.filter(x => ids.includes(x.id));
	}
}

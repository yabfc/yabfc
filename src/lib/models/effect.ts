export interface EffectChoice {
	id: string;
	effectId: string;
	scaling?: number;
	/** used for 'attaching' quality effects to other effects */
	sourceId?: string;
}

export interface ModifierInterface {
	id: 'speed' | 'power' | 'consumption' | 'productivity' | 'pollution' | 'quality';
	name?: string;
	/** @defaults to linear scaling */
	valueScaling?: 'exponential';
	value: number;
}

export class Modifier {
	id: 'speed' | 'power' | 'productivity' | 'pollution' | 'quality';
	name?: string;
	value: number;
	valueScaling?: 'exponential';

	constructor(modifier: ModifierInterface) {
		this.id = modifier.id === 'consumption' ? 'power' : modifier.id;
		this.name = modifier.name;
		this.valueScaling = modifier.valueScaling;
		this.value = modifier.value;
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

	getValue(qualityScaling = 1): number {
		if (this.valueScaling === 'exponential') return this.value;
		return this.value * qualityScaling;
	}

	updatePowerConsumption(power: number, scaling: number, qualityScaling = 1): number {
		if (this.id !== 'power') return power;

		if (this.valueScaling === 'exponential') {
			power += Math.pow(scaling, this.value);
			return power;
		}
		return power + this.getValue(qualityScaling) * scaling;
	}
}

interface EffectModuleBase {
	id: string;
	name?: string;
	available: boolean;
	modifiers: ModifierInterface[];
	hidden?: boolean;
	singleUse?: boolean;
	allowedEffects?: string[];
	displayOffset?: number;
}

// standard factorio effects
export interface FixedEffectModuleInterface extends EffectModuleBase {
	type: 'fixed';
}

// satisfactory summerslooping
export interface SteppedEffectModuleInterface extends EffectModuleBase {
	type: 'stepped';
	minValue: number;
	maxValue: number;
	step: number;
}

// satisfactory over/underclocking
export interface ModifiableEffectModuleInterface extends EffectModuleBase {
	type: 'modifiable';
	minValue: number;
	maxValue: number;
}

// limit factorio modifiers
export interface LimitedEffectModule extends EffectModuleBase {
	type: 'limited';
	minValue: number | undefined;
	maxValue: number | undefined;
}

export type EffectModuleInterface =
	| FixedEffectModuleInterface
	| SteppedEffectModuleInterface
	| ModifiableEffectModuleInterface
	| LimitedEffectModule;

export default class EffectModule {
	id: string;
	name?: string;
	available: boolean;
	modifiers: Modifier[];
	type: 'fixed' | 'stepped' | 'modifiable' | 'limited';
	minValue?: number;
	maxValue?: number;
	step?: number;
	hidden?: boolean;
	singleUse?: boolean;
	allowedEffects?: string[];
	displayOffset?: number;

	constructor(data: EffectModuleInterface) {
		this.id = data.id;
		this.name = data.name;
		this.available = data.available;
		this.modifiers = data.modifiers.map(modifier => new Modifier(modifier));
		this.type = data.type;
		this.hidden = data.hidden;
		this.singleUse = data.singleUse;
		this.allowedEffects = data.allowedEffects;
		this.displayOffset = data.displayOffset;

		if (data.type === 'modifiable' || data.type === 'stepped' || data.type === 'limited') {
			this.minValue = data.minValue;
			this.maxValue = data.maxValue;
		}

		if (data.type === 'stepped') {
			this.step = data.step;
		}
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

	getAllModifierIds(): string[] {
		return this.modifiers.map(x => x.id);
	}

	/** @returns power consumption with applied effect */
	updatePowerConsumption(power: number, scaling: number, qualityEffect?: EffectModule): number {
		if (this.type !== 'fixed' && scaling === 1) return power;
		this.modifiers.forEach(modifier => {
			const qualityModifier = qualityEffect?.modifiers.find(x => x.id === modifier.id);
			power = modifier.updatePowerConsumption(power, scaling, qualityModifier?.value);
		});
		return power;
	}
}

export function getAttachedQualityEffect(
	effects: EffectModule[],
	choice: EffectChoice,
	allChoices: EffectChoice[],
): EffectModule | undefined {
	const qualityChoice = allChoices.find(x => x.sourceId === choice.id);
	if (!qualityChoice) return;
	return effects.find(x => x.id === qualityChoice.effectId);
}

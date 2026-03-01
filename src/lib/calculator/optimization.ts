import EffectModule from '@/lib/models/effect';
import type Profile from '@/lib/models/profile';
import { type RequestedBaseItemIo } from '@/lib/models/recipe';

interface OptimizationWeights {
	power: number;
	building: number;
	cost: number;
}

export const FEWEST_BUILDINGS: OptimizationWeights = {
	power: 0.1,
	building: 1,
	cost: 0,
};

export default class OptimizationRequest {
	in: RequestedBaseItemIo[] = [];
	out: RequestedBaseItemIo[] = [];
	duration: number = 1;
	allowedEffectModules: EffectModule[] = [];
	limitations: string[] = [];
	weights: OptimizationWeights = { power: 1, building: 1, cost: 1 };
	tolerance: number = 0;

	constructor() {}

	setInputs(inputs: RequestedBaseItemIo[]) {
		this.in = inputs;

		return this;
	}

	setOutputs(outputs: RequestedBaseItemIo[]) {
		this.out = outputs;

		return this;
	}

	setDuration(duration: number) {
		this.duration = duration;

		return this;
	}

	setAllowedEffectModules(modules: EffectModule[]) {
		this.allowedEffectModules = modules;

		return this;
	}

	setLimitations(limitations: string[]) {
		this.limitations = limitations;

		return this;
	}

	setWeights(weights: OptimizationWeights) {
		this.weights = weights;

		return this;
	}

	setTolerance(tolerance: number) {
		this.tolerance = tolerance;

		return this;
	}

	/** Returns all item IDs specified in inputs and outputs. */
	getAllItemIds(): string[] {
		return [...this.in, ...this.out].map(x => x.id);
	}

	/**
	 * Validates the optimization request against the profile specified.
	 *
	 * @returns validation result
	 */
	isValid(profile: Profile) {
		const itemIds = this.getAllItemIds();
		if (!profile.allItemsExist(itemIds))
			// missing items
			return false;

		if (this.in.length !== 0 && this.out.length > 1)
			// only one output can be maximized
			return false;

		return true;
	}
}

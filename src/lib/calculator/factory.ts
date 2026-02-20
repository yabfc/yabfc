import type OptimizationRequest from '@/lib/calculator/optimization';
import type Profile from '@/lib/models/profile';
import { type RecipeVariant } from '@/lib/models/recipe';

import initHighs, { type HighsSolution } from 'highs';
import { LpModel } from '@/lib/calculator/lpmodel';

export interface Subject {
	cons: Record<VariantId, number>;
	mode: '<' | '<=' | '>=' | '>' | '=';
	value: number;
}

export type VariantId = string;
export type ItemId = string;

let highsPromise: Promise<any> | null = null;

function getHighs() {
	if (!highsPromise) {
		highsPromise = initHighs({
			locateFile: (file: string) => (file.endsWith('.wasm') ? '/highs.wasm' : file),
		});
	}
	return highsPromise;
}

export default class FactoryCalculator {
	private static recipeVariantInputs = 'requested-inputs';

	constructor(private profile: Profile) {}

	// TODO throw into web-worker?
	async runSolver(model: string): Promise<HighsSolution> {
		const highs = await getHighs();
		const result = highs.solve(model, {
			presolve: 'on',
			time_limit: 10,
		});

		return result;
	}

	/**
	 * Calculates the optimized factory given the optimization request.
	 *
	 * @throws {Error} if calculation is unfeasible
	 */
	async calculate(optimization: OptimizationRequest): Promise<RecipeVariant[] | undefined> {
		if (!optimization.isValid(this.profile))
			// TODO we may want to give a more detailed error in the future
			throw new Error('invalid optimization request');

		const recipeVariants = this.profile.generateRecipeVariants();

		const inputsVariant = this.generateRecipeVariantForInputs(optimization);
		if (inputsVariant) recipeVariants.push(inputsVariant);
		let model = new LpModel().generateModel(recipeVariants, optimization);

		//let lp = this.modelToLp(model);
		let solution = await this.runSolver(model);
		if (!this.isValidSolution(solution)) {
			return;
		}
		let selectedVariants: RecipeVariant[] = [];
		Object.entries(solution.Columns).forEach(([id, col]) => {
			if (col['Primal'] == 0) return;
			let amount = col['Primal'];
			let variant = recipeVariants.find(x => x.highsId === id);
			if (!variant || typeof amount !== 'number') return;
			variant.amount = amount;
			selectedVariants.push(variant);
		});

		return selectedVariants;
	}

	private isValidSolution(solution: HighsSolution): boolean {
		return (
			solution.Status === 'Optimal' ||
			solution.Status === 'Time limit reached' ||
			solution.Status === 'Target for objective reached' ||
			solution.Status === 'Bound on objective reached'
		);
	}

	/** Generates a recipe variant for all items the user has already obtained. */
	private generateRecipeVariantForInputs(
		optimization: OptimizationRequest,
	): RecipeVariant | undefined {
		if (optimization.in.length === 0) return;

		return {
			id: FactoryCalculator.recipeVariantInputs,
			highsId: 'x0',
			recipeId: FactoryCalculator.recipeVariantInputs,
			recipePriority: 0,
			machineId: '',
			in: [],
			out: optimization.in,
			requiredPower: 0,
			usedEffectModuleIds: [],
		};
	}
}

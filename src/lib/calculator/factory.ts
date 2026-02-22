import type OptimizationRequest from '@/lib/calculator/optimization';
import type Profile from '@/lib/models/profile';
import { type RecipeVariant } from '@/lib/models/recipe';
import solver, {
	type Model,
	type SolveResult,
	type VariableCoefficients,
} from 'javascript-lp-solver';

export default class FactoryCalculator {
	private static recipeVariantInputs = 'requested-inputs';

	constructor(private profile: Profile) {}

	/**
	 * Calculates the optimized factory given the optimization request.
	 *
	 * @throws {Error} if calculation is unfeasible
	 */
	calculate(optimization: OptimizationRequest) {
		if (!optimization.isValid(this.profile))
			// TODO we may want to give a more detailed error in the future
			throw new Error('invalid optimization request');

		let model = this.getDefaultSolverModel();

		model.constraints = this.generateConstraints(optimization);

		model = this.handleMaxOptimization(optimization, model);

		const recipeVariants = this.profile.generateRecipeVariants();

		const inputsVariant = this.generateRecipeVariantForInputs(optimization);
		if (inputsVariant) recipeVariants.push(inputsVariant);

		recipeVariants.forEach(variant => {
			const recipeVariables = this.generateRecipeVariables(optimization, variant);
			if (!recipeVariables) return;

			model.variables[variant.id] = recipeVariables;
			model.ints![variant.id] = 1;
		});

		const solved = solver.Solve(model) as SolveResult | undefined;

		if (!solved || !solved.feasible) throw new Error('factory calculation unfeasible');

		// only get variable values
		const recipes = Object.fromEntries(
			Object.entries(solved).filter(
				([k, v]) =>
					!['feasible', 'result', 'bounded', 'isIntegral'].includes(k) &&
					typeof v === 'number',
			),
		) as { [variable: string]: number };

		let selectedVariants: RecipeVariant[] = [];
		for (const id in recipes) {
			const amount = recipes[id];
			let variant = recipeVariants.find(x => x.id === id);

			if (!variant || typeof amount !== 'number') continue;

			variant.amount = amount;
			selectedVariants.push(variant);
		}
		return selectedVariants;
	}

	getPowerConsumption(variants: RecipeVariant[]): number {
		var powerConsumption = 0;
		for (let variant of variants) {
			if (variant.amount !== undefined) {
				powerConsumption += variant.requiredPower * variant.amount;
			}
		}

		return powerConsumption;
	}

	private getDefaultSolverModel(): Model {
		return {
			optimize: 'cost',
			opType: 'min',
			constraints: {},
			variables: {},
			options: {
				timeout: 5000,
				branching: 'strong',
			},
			ints: {},
		};
	}

	/** Generates constraints for items. */
	private generateConstraints(optimization: OptimizationRequest) {
		let constraints: Model['constraints'] = {};

		const requestedItems = optimization.getAllItemIds();

		// set all not-requested items
		this.profile.items
			.filter(x => !requestedItems.includes(x.id))
			.forEach(x => (constraints[x.id] = { min: 0 }));

		// set all inputs
		optimization.in.forEach(item => {
			if (item.exact) {
				constraints[item.id] = { equal: 1 };
			} else {
				constraints[item.id] = {
					max: 1,
					min: 0.000001,
				};
			}
		});

		// only set output constraints if no inputs are given
		if (optimization.in.length !== 0) return constraints;

		// set all outputs
		optimization.out.forEach(item => {
			if (item.exact) {
				constraints[item.id] = { equal: item.amount / optimization.duration };
			} else {
				constraints[item.id] = {
					min: (item.amount / optimization.duration) * (1 - optimization.tolerance),
				};
			}
		});

		return constraints;
	}

	/**
	 * Checks if the optimization request requires model `opType = 'max'`.
	 * Modifies the model if applicable. Assumes validated optimization request.
	 *
	 * @returns the (modified) model
	 */
	private handleMaxOptimization(optimization: OptimizationRequest, model: Model) {
		if (optimization.in.length === 0 || optimization.out.length !== 1) return model;

		const item = optimization.out[0];
		if (item.amount !== 0) return model;

		model.optimize = item.id;
		model.opType = 'max';

		return model;
	}

	/** Generates a recipe variant for all items the user has already obtained. */
	private generateRecipeVariantForInputs(
		optimization: OptimizationRequest,
	): RecipeVariant | undefined {
		if (optimization.in.length === 0) return;

		return {
			id: FactoryCalculator.recipeVariantInputs,
			recipeId: FactoryCalculator.recipeVariantInputs,
			recipePriority: 0,
			machineId: '',
			in: [],
			out: optimization.in,
			requiredPower: 0,
			usedEffectModuleIds: [],
		};
	}

	/** Generates recipe variables for a recipe variant. */
	private generateRecipeVariables(optimization: OptimizationRequest, variant: RecipeVariant) {
		let recipeVariables: VariableCoefficients = {};

		const requestedInputs = optimization.in.map(x => x.id);

		if (
			variant.out.find(
				x =>
					requestedInputs.includes(x.id) &&
					variant.id !== FactoryCalculator.recipeVariantInputs,
			)
		)
			return;

		variant.in.forEach(x => {
			recipeVariables[x.id] = -x.amount;
		});

		variant.out.forEach(x => {
			recipeVariables[x.id] = x.amount;
		});

		// TODO better measure to normalize this data to make this universal
		// cut the power down to MW, otherwise the cost get's way too high
		const powerCost = (optimization.weights.power * variant.requiredPower) / 1_000_000;

		// priority needs a really hard penalty. Alternate recipes in satisfactory
		// bloat the result up by a lot: 40 vs 60+ for turbo-motors
		const priorityCost = Math.pow(variant.recipePriority, optimization.weights.priority);
		const buildingCost = optimization.weights.building;
		recipeVariables.cost = powerCost + priorityCost + buildingCost;

		return recipeVariables;
	}
}

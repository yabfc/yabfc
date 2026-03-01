import LpModel from '@/lib/calculator/lpmodel';
import type OptimizationRequest from '@/lib/calculator/optimization';
import type Profile from '@/lib/models/profile';
import { type RecipeVariant } from '@/lib/models/recipe';
import { type HighsOptions, type HighsSolution } from 'highs';

export interface Subject {
	cons: Record<VariantId, number>;
	mode: '<' | '<=' | '>=' | '>' | '=';
	value: number;
}

export type VariantId = string;
export type ItemId = string;

type Res =
	| { id: number; ok: true; result: HighsSolution }
	| { id: number; ok: false; error: string };

let worker: Worker | null = null;
let nextId = 1;

const pending = new Map<
	number,
	{ resolve: (v: HighsSolution) => void; reject: (e: Error) => void }
>();

function getWorker() {
	if (!worker) {
		worker = new Worker(new URL('./highs.worker.ts', import.meta.url), {
			type: 'module',
		});

		worker.onmessage = (ev: MessageEvent<Res>) => {
			const msg = ev.data;
			const p = pending.get(msg.id);
			if (!p) return;
			pending.delete(msg.id);

			if (msg.ok) p.resolve(msg.result);
			else p.reject(new Error(msg.error));
		};

		worker.onerror = err => {
			const error = new Error(err.message || 'Worker error');
			for (const { reject } of pending.values()) reject(error);
			pending.clear();
		};
	}
	return worker;
}

export default class FactoryCalculator {
	private static recipeVariantInputs = 'requested-inputs';

	constructor(private profile: Profile) {}

	async runSolver(model: string): Promise<HighsSolution> {
		const w = getWorker();
		const id = nextId++;
		const p = new Promise<HighsSolution>((resolve, reject) => {
			pending.set(id, { resolve, reject });
		});

		const options: HighsOptions = {
			presolve: 'on',
			time_limit: 10,
		};
		w.postMessage({ id, model, options });
		return p;
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

		let solution = await this.runSolver(model);

		if (!this.isValidSolution(solution)) {
			return;
		}
		let selectedVariants: RecipeVariant[] = [];
		Object.entries(solution.Columns).forEach(([id, col]) => {
			if (col['Primal'] == 0) return;
			let amount = col['Primal'];
			// even though the solver should only return ints, there sometimes are
			// very small numbers included like e-13 or so, this filtes them out
			if (amount < 0.001) {
				return;
			}
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
			recipeCost: 0,
			machineId: '',
			in: [],
			out: optimization.in,
			requiredPower: 0,
			usedEffectModuleIds: [],
		};
	}
}

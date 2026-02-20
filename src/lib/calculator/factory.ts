import type OptimizationRequest from '@/lib/calculator/optimization';
import type Profile from '@/lib/models/profile';
import { type RecipeVariant } from '@/lib/models/recipe';

import initHighs, { type HighsSolution } from 'highs';

interface AllConstraints {
	flow: Record<ItemId, Record<VariantId, number>>;
	costs: Record<VariantId, number>;
}

interface Subject {
	cons: Record<VariantId, number>;
	mode: '<' | '<=' | '>=' | '>' | '=';
	value: number;
}

type VariantId = string;
type ItemId = string;

let highsPromise: Promise<any> | null = null;

function getHighs() {
	if (!highsPromise) {
		highsPromise = initHighs({
			locateFile: (file: string) => (file.endsWith('.wasm') ? '/highs.wasm' : file),
		});
	}
	return highsPromise;
}

class LpModel {
	private objective: 'min' | 'max' = 'min';
	private costs: string[] = [];
	private subjects: string[] = [];
	private ints: string[] = [];

	private get_sign(value: number): string {
		return value >= 0 ? '+' : '-';
	}

	private add_cost(id: VariantId, cost: number) {
		let out = ` ${id}`;
		if (cost !== 1) out = ` ${Math.abs(cost)}` + out;
		if (this.costs.length === 0) {
			this.costs.push(`costs: ${out}`);
		} else {
			this.costs.push(`${this.get_sign(cost)}${out}`);
		}
	}

	private add_subject(id: ItemId, subject: Subject) {
		let s: string[] = [];
		Object.entries(subject.cons).map(([fid, flow]) => {
			if (s.length === 0) {
				s.push(`${id.replaceAll('-', '_')}: ${flow} ${fid}`);
			} else {
				s.push(` ${this.get_sign(flow)} ${Math.abs(flow)} ${fid}`);
			}
		});
		s.push(`${s.pop()} ${subject.mode} ${subject.value}`);

		this.subjects.push(s.join('\n'));
	}

	/* adding an upper bound like this has big performance improvements */
	private add_cost_subject(ids: VariantId[], bound: number) {
		let s: string[] = [];
		ids.forEach(id => {
			if (s.length === 0) {
				s.push(`cost_bound: ${id}`);
			} else {
				s.push(` + ${id}`);
			}
		});
		s.push(`${s.pop()} <= ${bound}`);

		this.subjects.push(s.join('\n'));
	}

	private add_ints(ids: VariantId[]) {
		this.ints.push(ids.join('\n'));
	}

	private get_model(): string {
		let out: string[] = [`${this.objective}`];
		out.push(this.costs.join('\n'));
		out.push('Subject To');
		out.push(this.subjects.join('\n'));
		out.push('Generals');
		out.push(this.ints.join('\n'));
		out.push('end');
		return out.join('\n');
	}

	private set_objective(obj: 'min' | 'max') {
		this.objective = obj;
	}

	generateModel(variants: RecipeVariant[], optimization: OptimizationRequest): string {
		let allVars = this.generateVariables(variants, optimization);
		let flows = allVars.flow;
		let costs = allVars.costs;
		let subjects = this.generateConstraints(flows, optimization);

		Object.entries(costs).forEach(([id, cost]) => {
			this.add_cost(id, cost);
		});
		Object.entries(subjects).forEach(([id, subject]) => {
			this.add_subject(id, subject);
		});
		// TODO estimate upper bound
		this.add_cost_subject(Object.keys(costs), 200);
		this.add_ints(Object.keys(costs));
		return this.get_model();
	}

	/** generates constraints  */
	private generateConstraints(
		flows: Record<ItemId, Record<VariantId, number>>,
		optimization: OptimizationRequest,
	): Record<ItemId, Subject> {
		let subjects: Record<ItemId, Subject> = {};
		// TODO fix this
		//optimization.in.forEach(item => {
		//	if (item.exact) {
		//		subjects[item.id] = {cons: constraints[item.id] || [], mode: "=", value: 1};
		//	}
		//});
		optimization.out.forEach(item => {
			if (item.exact) {
				subjects[item.id] = {
					cons: flows[item.id] || {},
					mode: '=',
					value: item.amount / optimization.duration,
				};
			} else {
				subjects[item.id] = {
					cons: flows[item.id] || {},
					mode: '>=',
					value: (item.amount / optimization.duration) * (1 - optimization.tolerance),
				};
			}
		});

		Object.keys(flows).forEach(id => {
			if (subjects[id]) return;
			subjects[id] = { cons: flows[id], mode: '>=', value: 0 };
		});
		return subjects;
	}

	/** generate item constraints (i.e item flow per variant) and variant costs */
	private generateVariables(
		variants: RecipeVariant[],
		optimization: OptimizationRequest,
	): AllConstraints {
		// the VariantId is not allowed to exist multiple times inside one constraint
		let flows: Record<ItemId, Record<VariantId, number>> = {};
		let costs: Record<VariantId, number> = {};
		variants.forEach(variant => {
			variant.in.forEach(x => {
				flows[x.id] ??= {};
				flows[x.id][variant.highsId] = (flows[x.id][variant.highsId] || 0) - x.amount;
			});

			variant.out.forEach(x => {
				flows[x.id] ??= {};
				flows[x.id][variant.highsId] = (flows[x.id][variant.highsId] || 0) + x.amount;
			});

			// cut the power down to MW, otherwise the cost get's way too high
			let powerCost = Math.pow(
				variant.requiredPower / 1_000_000 + 1,
				optimization.weights.power,
			);

			// priority needs a really hard penalty. Alternate recipes in satisfactory
			// bloat the result up by a lot: 40 vs 60+ for turbo-motors
			let priorityCost = Math.pow(variant.recipePriority, optimization.weights.priority);
			let buildingCost = Math.pow(10, optimization.weights.building);

			// actually set it to 0
			if (optimization.weights.power === 0) powerCost = 0;
			if (optimization.weights.priority === 0) priorityCost = 0;
			if (optimization.weights.building === 0) buildingCost = 0;
			console.log(powerCost + buildingCost + priorityCost);
			costs[variant.highsId] = powerCost + buildingCost + priorityCost;
		});
		return { flow: flows, costs };
	}
}

export default class FactoryCalculator {
	private static recipeVariantInputs = 'requested-inputs';

	constructor(private profile: Profile) {}

	// TODO throw into web-worker?
	async runSolver(model: string): Promise<HighsSolution> {
		const highs = await getHighs();
		console.log(model);
		const result = highs.solve(model, {
			presolve: 'on',
			write_solution_style: 4,
			time_limit: 5,
		});

		return result;
	}

	/**
	 * Calculates the optimized factory given the optimization request.
	 *
	 * @throws {Error} if calculation is unfeasible
	 */
	async calculate(optimization: OptimizationRequest): Promise<RecipeVariant[]> {
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
			console.log(solution.Status);
			return [];
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
		console.log(selectedVariants);
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

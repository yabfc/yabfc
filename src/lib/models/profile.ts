import Machine, { type MachineInterface } from '@/lib/models/machine';
import Item, { type ItemInterface } from '@/lib/models/item';
import Recipe, { type RecipeInterface } from '@/lib/models/recipe';
import EffectModule, { type EffectModuleInterface } from '@/lib/models/effect';
import Research, { type ResearchInterface } from '@/lib/models/research';
import solver, { type Model, type SolveResult } from 'javascript-lp-solver';

export interface ProfileInterface {
	id: string;
	name: string;
	items: ItemInterface[];
	recipes: RecipeInterface[];
	machines: MachineInterface[];
	machineEffects: EffectModuleInterface[];
	research: ResearchInterface[];
}

export default class Profile {
	id: string;
	name: string;

	items: Item[];
	recipes: Recipe[];
	machines: Machine[];
	machineEffects: EffectModule[];
	research: Research[];
	productionMatrix: number[][];
	upload?: boolean;

	constructor(profile: ProfileInterface, upload?: boolean) {
		this.id = profile.id;
		this.name = profile.name;

		this.items = profile.items.map(x => new Item(x));
		this.recipes = profile.recipes.map(x => new Recipe(x));
		this.machines = profile.machines.map(x => new Machine(x));
		this.machineEffects = profile.machineEffects.map(x => new EffectModule(x));
		this.research = profile.research.map(x => new Research(x));
		this.productionMatrix = this.buildProductionMatrix();
		this.upload = upload;
	}

	private buildProductionMatrix(): number[][] {
		const rows = this.items.length;
		const recipes = this.recipes.filter(x => x.craftable !== false && x.available === true);
		const matrix = Array.from({ length: rows }, () => new Array(recipes.length).fill(0));
		let itemIndexMap = new Map(this.items.map((it, i) => [it.id, i]));

		recipes.forEach((recipe, colIdx) => {
			const duration = recipe.duration;
			recipe.in.forEach(io => {
				const rowIdx = itemIndexMap.get(io.id);
				if (rowIdx !== undefined) matrix[rowIdx][colIdx] -= io.amount / duration;
			});
			recipe.out.forEach(io => {
				const rowIdx = itemIndexMap.get(io.id);
				if (rowIdx !== undefined) matrix[rowIdx][colIdx] += io.amount / duration;
			});
		});
		return matrix;
	}

	calculateOptimal(
		itemId: string,
		targetAmount: number,
		weights: { power: number; building: number; priority: number },
	): SolveResult | undefined {
		if (this.getItemById(itemId) === undefined) {
			console.log('item does not exist');
			return;
		}

		const model: Model = {
			optimize: 'cost',
			opType: 'min',
			constraints: {},
			variables: {},
			options: {
				timeout: 5000,
			},
		};

		// net production of each item should be >= 0, (for the target item >= targetAmount)
		this.items.filter(x => x.id != itemId).forEach(x => (model.constraints[x.id] = { min: 0 }));
		model.constraints[itemId] = { equal: targetAmount };

		// set variables so i.e the recipes
		this.recipes
			.filter(x => x.craftable !== false && x.available === true)
			.forEach((recipe, colIdx) => {
				const recipeVar: any = {};

				// map the matrix values to the solver constraints
				this.items.forEach((item, rowIdx) => {
					const flow = this.productionMatrix![rowIdx][colIdx];
					if (flow !== 0) recipeVar[item.id] = flow;
				});

				// cut the power down to MW, otherwise the cost get's way too high
				const powerCost =
					(weights.power * (this.getMinPowerConsumptionByRecipeId(recipe.id) ?? 0)) /
					1_000_000;
				const priorityCost = weights.priority * recipe.priority;
				const buildingCost = weights.building * 1;
				recipeVar.cost = powerCost + priorityCost + buildingCost;

				model.variables[recipe.id] = recipeVar;
			});
		return solver.Solve(model) as SolveResult | undefined;
	}

	getItemById(id: string): Item | undefined {
		return this.items.find(x => x.id == id);
	}

	getRecipeById(id: string): Recipe | undefined {
		return this.recipes.find(x => x.id == id);
	}

	getRecipesByItemOutputId(id: string): Recipe[] {
		return this.recipes.filter(x => x.out.find(io => io.id == id));
	}

	getMinPowerConsumptionByRecipeId(id: string): number | undefined {
		const recipe = this.getRecipeById(id);
		if (recipe === undefined) return;
		const valid_machines = this.machines.filter(x =>
			x.recipeCategories.includes(recipe.category),
		);
		if (valid_machines.length === 0) {
			return;
		}
		const minConsumption = valid_machines.reduce((min, machine) =>
			machine.requiredPower < min.requiredPower ? machine : min,
		);
		return minConsumption.requiredPower;
	}

	getMachinesByRecipe(recipe: Recipe): Machine[] {
		return this.machines.filter(x => x.recipeCategories.includes(recipe.category));
	}
}

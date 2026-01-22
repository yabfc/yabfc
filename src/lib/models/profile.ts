import Machine, { type MachineInterface } from '@/lib/models/machine';
import Item, { type ItemInterface } from '@/lib/models/item';
import Recipe, { type RecipeInterface } from '@/lib/models/recipe';
import EffectModule, { type EffectModuleInterface } from '@/lib/models/effect';
import Research, { type ResearchInterface } from '@/lib/models/research';
import solver from 'javascript-lp-solver';

export class ProductionGraph {
	private recipes: Recipe[];
	private items: Item[];
	private matrix: number[][]; // Rows: Items, Cols: Recipes
	private itemIndexMap: Map<string, number>;
	private recipeIndexMap: Map<string, number>;

	constructor(profile: Profile) {
		this.recipes = profile.recipes.filter(r => r.available);
		this.items = profile.items;

		this.itemIndexMap = new Map(this.items.map((it, i) => [it.id, i]));
		this.recipeIndexMap = new Map(this.recipes.map((re, i) => [re.id, i]));

		this.matrix = this.buildMatrix();
	}

	private buildMatrix(): number[][] {
		const rows = this.items.length;
		const cols = this.recipes.length;
		const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

		this.recipes.forEach((recipe, colIdx) => {
			const duration = recipe.duration;
			recipe.in.forEach(io => {
				const rowIdx = this.itemIndexMap.get(io.id);
				if (rowIdx !== undefined) matrix[rowIdx][colIdx] -= io.amount / duration;
			});
			recipe.out.forEach(io => {
				const rowIdx = this.itemIndexMap.get(io.id);
				if (rowIdx !== undefined) matrix[rowIdx][colIdx] += io.amount / duration;
			});
		});
		return matrix;
	}

	calculateOptimal(
		itemId: string,
		targetAmount: number,
		weights: { power: number; resources: number; preference: number },
	) {
		const model: any = {
			optimize: 'cost',
			opType: 'min',
			constraints: {},
			variables: {},
		};

		// 1. Set constraints based on our Matrix (Each row is an item)
		this.items.forEach(item => {
			// We want the net production of each item to be >= 0 (no missing resources)
			// Except for our target item, which must be >= targetAmount
			const minRequired = item.id === itemId ? targetAmount : 0;
			model.constraints[item.id] = { min: minRequired };
		});

		// 2. Set variables (Recipes)
		this.recipes.forEach((recipe, colIdx) => {
			const recipeVar: any = {};

			// Map the matrix values to the solver constraints
			this.items.forEach((item, rowIdx) => {
				const flow = this.matrix[rowIdx][colIdx];
				if (flow !== 0) recipeVar[item.id] = flow;
			});

			// 3. Add Pareto Costs (Weighting)
			// You can change 'cost' based on user sliders
			//const powerCost = this.getPowerUsage(recipe); // e.g., 30 for 30MW
			// powerCost * weights.power +
			const preferenceCost = recipe.priority * weights.preference;
			recipeVar.cost = preferenceCost;

			model.variables[recipe.id] = recipeVar;
		});

		return solver.Solve(model);
	}
}

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
	upload?: boolean;

	constructor(profile: ProfileInterface, upload?: boolean) {
		this.id = profile.id;
		this.name = profile.name;

		this.items = profile.items.map(x => new Item(x));
		this.recipes = profile.recipes.map(x => new Recipe(x));
		this.machines = profile.machines.map(x => new Machine(x));
		this.machineEffects = profile.machineEffects.map(x => new EffectModule(x));
		this.research = profile.research.map(x => new Research(x));
		this.upload = upload;
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

	getMachinesByRecipe(recipe: Recipe): Machine[] {
		return this.machines.filter(x => x.recipeCategories.includes(recipe.category));
	}

	getProductionGraph(): ProductionGraph {
		return new ProductionGraph(this);
	}
}

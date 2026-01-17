import Machine, { type MachineInterface } from '@/lib/models/machine';
import Item, { type ItemInterface } from '@/lib/models/item';
import Recipe, { type RecipeInterface } from '@/lib/models/recipe';
import EffectModule, { type EffectModuleInterface } from '@/lib/models/effect';
import Research, { type ResearchInterface } from '@/lib/models/research';

interface ProductionNode {
	item: Item;
	amount: number;
	recipe?: Recipe;
	children: ProductionNode[];
}

export class ProductionManager {
	constructor(private profile: Profile) {}

	public calculateRecipeChain(endproductId: string, requiredAmount: number = 1): ProductionNode | undefined {
		console.log(endproductId)
		const item = this.profile.items.find(i => i.id === endproductId);

		if (item === undefined) {
			console.warn("Invalid endproduct ID given.")
			return;
		}

		if (item.category === "raw-resource" || item.id.includes("ore") || item.type === "fluid" ) {
			return;
		}

		// Change to better priority matching (e.g. based on power, least machines, etc.)
		const recipe = this.profile.recipes
			.filter(r => r.out.some(output => output.id === endproductId))
			.sort((a, b) => b.priority - a.priority)[0];

		if (recipe === undefined) {
			console.warn("No recipe found for item '" + item.getDisplayName + "'");
			return;
		}

		const node: ProductionNode = {
			item: item,
			amount: requiredAmount,
			recipe: recipe,
			children: []
		}

		const outputDef = recipe.out.find(o => o.id === endproductId);
		const amountPerCycle = outputDef?.amount || 1;

		const neededCycles = requiredAmount / amountPerCycle;

		for (const input of recipe.in) {
			const totalInputNeeded = input.amount * neededCycles;

			node.children.push(
				this.calculateRecipeChain(input.id, totalInputNeeded)!
			);
		}

		return node;
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
}

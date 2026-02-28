import EffectModule, { type EffectModuleInterface } from '@/lib/models/effect';
import Item, { type ItemInterface } from '@/lib/models/item';
import Machine, { MachineFeature, type MachineInterface } from '@/lib/models/machine';
import Recipe, { type RecipeInterface, type RecipeVariant } from '@/lib/models/recipe';
import Research, { type ResearchInterface } from '@/lib/models/research';
import Ajv from 'ajv';
import schema from '../../../profiles/schema.json';
import { nanoid } from 'nanoid';

const ajv = new Ajv();
const validate = ajv.compile(schema);

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

	private _isDefault: boolean;
	public get isDefault() {
		return this._isDefault;
	}

	items: Item[];
	recipes: Recipe[];
	machines: Machine[];
	machineEffects: EffectModule[];
	research: Research[];

	constructor(profile: ProfileInterface, isDefault = true) {
		if (!this._validate(profile)) {
			throw new Error(`invalid profile ${profile.name} submitted`);
		}

		this.id = profile.id;
		this.name = profile.name;
		this._isDefault = isDefault;

		this.items = profile.items.map(x => new Item(x));
		this.recipes = profile.recipes.map(x => new Recipe(x));
		this.machines = profile.machines.map(x => new Machine(x));
		this.machineEffects = profile.machineEffects.map(x => new EffectModule(x));
		this.research = profile.research.map(x => new Research(x));
	}

	generateRecipeVariants(): RecipeVariant[] {
		const allVariants: RecipeVariant[] = [];
		const validRecipes = this.recipes.filter(r => r.craftable !== false && r.available);
		validRecipes.forEach(recipe => {
			const machines = this.getMachinesByRecipe(recipe.category).filter(m => m.available);
			machines.forEach(machine => {
				// default variant, no effects
				allVariants.push(this.calculateRecipeVariant(recipe, machine, [], 1));

				// variants with effects
				for (const feature of machine.features) {
					if (feature.hidden || !feature.effectPerSlot || feature.itemSlots <= 0) {
						continue;
					}

					this.addModuleVariants(allVariants, recipe, machine, feature);
					this.addEffectVariants(allVariants, recipe, machine, feature);
				}
			});
		});
		return allVariants;
	}

	addModuleVariants(
		variants: RecipeVariant[],
		recipe: Recipe,
		machine: Machine,
		feature: MachineFeature,
	): void {
		const perSlotEffects = this.machineEffects.filter(
			x => feature.effectPerSlot.includes(x.id) && !x.id.includes('quality') && x.perSlot,
		);

		const combinations = this.getAllModuleCombinations(perSlotEffects, feature.itemSlots);
		for (const combo of combinations) {
			variants.push(this.calculateRecipeVariant(recipe, machine, combo, 1));
		}
	}

	private addEffectVariants(
		variants: RecipeVariant[],
		recipe: Recipe,
		machine: Machine,
		feature: MachineFeature,
	): void {
		const effects = this.machineEffects.filter(
			x => feature.effectPerSlot.includes(x.id) && !x.perSlot,
		);

		for (const effect of effects) {
			const modifiable = effect.modifiers.find(m => m.modifiable);

			if (modifiable) {
				// over/underclocking
				const stepCount = 32;
				const range = modifiable.maxValue! - modifiable.minValue!;
				const stepSize = range / stepCount;

				for (let i = 0; i <= stepCount; i++) {
					const value = modifiable.minValue! + i * stepSize;
					variants.push(this.calculateRecipeVariant(recipe, machine, [effect], value));
				}
			} else {
				// summerslooping
				for (let i = 1; i <= feature.itemSlots; i++) {
					const boostRatio = i / feature.itemSlots;
					variants.push(this.calculateRecipeVariant(recipe, machine, [effect], boostRatio));
				}
			}
		}
	}

	getAllModuleCombinations(availableModules: EffectModule[], slots: number): EffectModule[][] {
		if (slots === 0) return [[]];

		const results: EffectModule[][] = [];
		const currentCombo: EffectModule[] = [];

		function findCombinations(start: number) {
			if (currentCombo.length === slots) {
				results.push([...currentCombo]);
				return;
			}

			for (let i = start; i < availableModules.length; i++) {
				currentCombo.push(availableModules[i]);
				findCombinations(i);
				currentCombo.pop();
			}
		}

		findCombinations(0);
		return results;
	}

	calculateRecipeVariant(
		recipe: Recipe,
		machine: Machine,
		effects: EffectModule[],
		scaling: number,
	): RecipeVariant {
		let speed = machine.getBaseCraftingSpeed(this.machineEffects);
		let power = machine.getPowerConsumption(effects, scaling);
		let productivity = 1;
		effects.forEach(effect => {
			effect.modifiers.forEach(modifier => {
				if (modifier.id === 'speed' && modifier.onlyOutputScales === true && !modifier.modifiable) {
					if (!effect.perSlot) {
						productivity *= modifier.value! * scaling;
					} else {
						productivity *= modifier.value!;
					}
				} else if (modifier.id === 'speed' && modifier.modifiable) {
					speed *= scaling;
				} else if (modifier.id === 'speed') {
					speed *= modifier.value!;
				}
			});
		});

		return {
			id: nanoid(),
			recipeId: recipe.id,
			recipePriority: recipe.priority,
			machineId: machine.id,
			in: recipe.in.map(x => ({ ...x, amount: (x.amount * speed) / recipe.duration })),
			out: recipe.out.map(x => ({
				...x,
				amount: (x.amount * productivity * speed) / recipe.duration,
			})),
			requiredPower: power,
			usedEffectModuleIds: effects.map(x => ({
				id: nanoid(),
				effectId: x.id,
				scaling: scaling,
			})),
		};
	}

	getItemById(id: string): Item | undefined {
		return this.items.find(x => x.id == id);
	}

	/** Check if all items exist on this profile. */
	allItemsExist(ids: string[]): boolean {
		return ids.every(id => this.items.some(x => x.id === id));
	}

	getRecipeById(id: string): Recipe | undefined {
		return this.recipes.find(x => x.id == id);
	}

	getRecipesByItemOutputId(id: string): Recipe[] {
		return this.recipes.filter(x => x.out.find(io => io.id == id));
	}

	getEffectModuleById(id: string) {
		return this.machineEffects.find(x => x.id === id);
	}

	getAllModifierIds(): string[] {
		return [...new Set(this.machineEffects.map(x => x.getAllModifierIds()).flat())];
	}

	getMinPowerConsumptionByRecipeId(id: string): number | undefined {
		const recipe = this.getRecipeById(id);
		if (!recipe) return;
		const validMachines = this.machines.filter(x => x.recipeCategories.includes(recipe.category));
		if (validMachines.length === 0) {
			return;
		}
		const minConsumption = validMachines.reduce((min, machine) =>
			machine.requiredPower < min.requiredPower ? machine : min,
		);
		return minConsumption.requiredPower;
	}

	getMachinesByRecipe(recipeCategory: string): Machine[] {
		return this.machines.filter(x => x.recipeCategories.includes(recipeCategory));
	}

	getMachineById(id: string) {
		return this.machines.find(x => x.id === id);
	}

	private _validate(profile: ProfileInterface) {
		if (!validate(profile)) {
			const errors = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
			return false;
		}

		if (!this._validateRecipes(profile.recipes)) return false;

		if (!this._validateItems(profile.items, profile.recipes)) return false;

		if (!this._validateMachines(profile.machines, profile.recipes)) return false;

		return true;
	}

	private _validateRecipes(recipes: RecipeInterface[]) {
		var idsAll: Set<string> = new Set();
		var idsIn: Set<string> = new Set();
		var idsOut: Set<string> = new Set();
		var recipe_ids: string[] = [];

		for (let r of recipes) {
			if (!recipe_ids.includes(r.id)) {
				recipe_ids.push(r.id);
			}

			r.in.forEach(input => idsIn.add(input.id));
			r.out.forEach(output => idsOut.add(output.id));
			idsAll = new Set(...idsAll, ...idsIn, ...idsOut);
		}

		const difference = new Set([...idsIn].filter(id => !idsOut.has(id)));

		if (difference.size > 0) {
			return false;
		}

		return true;
	}

	private _validateItems(items: ItemInterface[], recipes: RecipeInterface[]) {
		var idsRecipes: Set<string> = new Set();
		var itemIds: Set<string> = new Set();

		for (let r of recipes) {
			r.in.forEach(input => idsRecipes.add(input.id));
			r.out.forEach(output => idsRecipes.add(output.id));
		}

		for (let i of items) {
			if (!itemIds.has(i.id)) {
				itemIds.add(i.id);
			}
		}

		const difference = new Set([...idsRecipes].filter(id => !itemIds.has(id)));

		if (difference.size > 0) {
			return false;
		}

		return true;
	}

	private _validateMachines(machines: MachineInterface[], recipes: RecipeInterface[]) {
		var categoriesRecipe: Set<string> = new Set();
		var categoriesMachine: Set<string> = new Set();

		for (let r of recipes) {
			categoriesRecipe.add(r.category);
		}

		for (let m of machines) {
			categoriesMachine = new Set([...categoriesMachine, ...m.recipeCategories]);
		}

		const difference = new Set([...categoriesRecipe].filter(id => !categoriesMachine.has(id)));

		for (let category of difference) {
			if (['manual-harvest', 'build-gun', 'equipment-workshop'].includes(category)) {
				difference.delete(category);
			}
		}

		if (difference.size > 0) {
			return false;
		}

		return true;
	}
}

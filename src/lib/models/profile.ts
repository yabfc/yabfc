import EffectModule, { type EffectModuleInterface } from '@/lib/models/effect';
import Item, { type ItemInterface } from '@/lib/models/item';
import Machine, { type MachineInterface } from '@/lib/models/machine';
import Recipe, { type RecipeInterface } from '@/lib/models/recipe';
import Research, { type ResearchInterface } from '@/lib/models/research';
import Ajv from 'ajv';
import schema from '@profiles/schema.json';
import type SettingInterface from '@/lib/models/setting';
import { Conveyor, type ConveyorInterface } from '@/lib/models/conveyor';
import alerts from '@/stores/alerts.svelte';
const ajv = new Ajv();
const validate = ajv.compile(schema);

export interface ProfileInterface {
	id: string;
	name: string;
	items: ItemInterface[];
	recipes: RecipeInterface[];
	machines: MachineInterface[];
	conveyors: ConveyorInterface[];
	machineEffects: EffectModuleInterface[];
	research: ResearchInterface[];
	settings: SettingInterface;
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
	conveyors: Conveyor[];
	machineEffects: EffectModule[];
	research: Research[];
	settings: SettingInterface;

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
		this.conveyors = profile.conveyors.map(x => new Conveyor(x));
		this.machineEffects = profile.machineEffects.map(x => new EffectModule(x));
		this.research = profile.research.map(x => new Research(x));
		this.settings = profile.settings;
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
		const validMachines = this.machines.filter(x =>
			x.recipeCategories.includes(recipe.category),
		);
		if (validMachines.length === 0) {
			return;
		}
		const minConsumption = validMachines.reduce((min, machine) =>
			machine.requiredPower < min.requiredPower ? machine : min,
		);
		return minConsumption.requiredPower;
	}

	getMachinesByRecipe(recipeCategory: string): Machine[] {
		return this.machines
			.filter(x => x.recipeCategories.includes(recipeCategory))
			.sort((a, b) => a.id.localeCompare(b.id));
	}

	getMachineById(id: string) {
		return this.machines.find(x => x.id === id);
	}

	getProductivityOverrideName(): string {
		return this.settings.effectNameOverride?.productivity ?? 'Productivity';
	}

	getSpeedOverrideName(): string {
		return this.settings.effectNameOverride?.speed ?? 'Speed';
	}

	formatDefaultDuration(): string | undefined {
		const duration = this.settings.defaultDuration;
		if (duration == null) return;

		if (duration < 60) {
			return duration === 1 ? 's' : `${duration}s`;
		}
		if (duration === 60) {
			return 'min';
		}

		const minutes = duration / 60;
		return `${Number(minutes.toFixed(1))}min`;
	}

	private _validate(profile: ProfileInterface) {
		if (!validate(profile)) {
			const errors = validate.errors
				?.map(err => `${err.instancePath} ${err.message}`)
				.join(', ');
			alerts.push(`Profile JSON Schema validation error: ${errors ?? ''}`, 'ERROR');
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
			if (recipe_ids.includes(r.id)) {
				alerts.push(`Profile validation error: duplicate Recipe id: ${r.id}`, 'ERROR');
				return false;
			} else {
				recipe_ids.push(r.id);
			}

			r.in.forEach(input => idsIn.add(input.id));
			r.out.forEach(output => idsOut.add(output.id));
			idsAll = new Set(...idsAll, ...idsIn, ...idsOut);
		}

		const difference = new Set([...idsIn].filter(id => !idsOut.has(id)));

		if (difference.size > 0) {
			alerts.push(
				`Profile validation error: the following item IDs can't be produced but are an input in another recipe: ${[...difference].join(', ')}`,
				'ERROR',
			);
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
			if (itemIds.has(i.id)) {
				alerts.push(`Profile validation error: duplicate Item id: ${i.id}`, 'ERROR');
				return false;
			} else {
				itemIds.add(i.id);
			}
		}

		const difference = new Set([...idsRecipes].filter(id => !itemIds.has(id)));

		if (difference.size > 0) {
			alerts.push(
				`Profile validation error: the following items cant be produced: ${[...difference].join(', ')}`,
				'ERROR',
			);
			return false;
		}

		return true;
	}

	private _validateMachines(machines: MachineInterface[], recipes: RecipeInterface[]) {
		var categoriesRecipe: Set<string> = new Set();
		var categoriesMachine: Set<string> = new Set();

		for (let r of recipes) {
			if (r.craftable === false) {
				continue;
			}
			categoriesRecipe.add(r.category);
		}

		for (let m of machines) {
			categoriesMachine = new Set([...categoriesMachine, ...m.recipeCategories]);
		}

		const difference = new Set([...categoriesRecipe].filter(id => !categoriesMachine.has(id)));

		if (difference.size > 0) {
			alerts.push(
				`Profile validation error: the following recipe categories cant be produced by any machine: ${[...difference].join(', ')}`,
				'ERROR',
			);
			return false;
		}

		return true;
	}
}

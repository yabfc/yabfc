import EffectModule, { type EffectModuleInterface } from '@/lib/models/effect';
import Item, { type ItemInterface } from '@/lib/models/item';
import Machine, { type MachineInterface } from '@/lib/models/machine';
import Recipe, { type RecipeInterface } from '@/lib/models/recipe';
import Research, { type ResearchInterface } from '@/lib/models/research';
import type SettingInterface from '@/lib/models/setting';

export interface ProfileInterface {
	id: string;
	name: string;
	items: ItemInterface[];
	recipes: RecipeInterface[];
	machines: MachineInterface[];
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
	machineEffects: EffectModule[];
	research: Research[];
	settings: SettingInterface;

	constructor(profile: ProfileInterface, isDefault = true) {
		this.id = profile.id;
		this.name = profile.name;
		this._isDefault = isDefault;

		this.items = profile.items.map(x => new Item(x));
		this.recipes = profile.recipes.map(x => new Recipe(x));
		this.machines = profile.machines.map(x => new Machine(x));
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
}

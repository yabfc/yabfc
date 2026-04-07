import EffectModule, { type EffectChoice, type EffectModuleInterface } from '@/lib/models/effect';
import Item, { type ItemInterface } from '@/lib/models/item';
import Machine, { MachineFeature, type MachineInterface } from '@/lib/models/machine';
import Recipe, { type RecipeInterface, type RecipeVariant } from '@/lib/models/recipe';
import Research, { type ResearchInterface } from '@/lib/models/research';
import type SettingInterface from '@/lib/models/setting';
import { nanoid } from 'nanoid';

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

	/**
	 * **DON'T READ OR WRITE THIS VALUE. USE `nextHighsId()` TO GET AN ID!**
	 *
	 * Counts recipe variations to supply a short but unique ID
	 */
	private _highsIdCounter = 1;
	/** Returns the next highs ID */
	private nextHighsId() {
		return this._highsIdCounter++;
	}

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

	generateRecipeVariants(): RecipeVariant[] {
		const allVariants: RecipeVariant[] = [];
		const validRecipes = this.recipes.filter(r => r.craftable !== false && r.available);
		validRecipes.forEach(recipe => {
			const machines = this.getMachinesByRecipe(recipe.category).filter(m => m.available);
			machines.forEach(machine => {
				// default variant, no effects
				allVariants.push(this.calculateRecipeVariant(recipe, machine, []));

				let features: MachineFeature[] = [];
				// variants with effects
				for (const feature of machine.features) {
					if (feature.hidden || !feature.effectPerSlot) {
						continue;
					}

					features.push(feature);
					if (feature.itemSlots > 0)
						this.addModuleVariants(allVariants, recipe, machine, feature);
				}
				this.addEffectVariants(allVariants, recipe, machine, features);
			});
		});

		return allVariants;
	}

	addModuleVariants(
		variants: RecipeVariant[],
		recipe: Recipe,
		machine: Machine,
		feature: MachineFeature,
	) {
		const perSlotEffects = this.machineEffects.filter(
			x => feature.effectPerSlot.includes(x.id) && !x.id.includes('quality') && x.perSlot,
		);

		const combinations = this.getAllModuleCombinations(perSlotEffects, feature.itemSlots);
		for (const combo of combinations) {
			variants.push(this.calculateRecipeVariant(recipe, machine, combo));
		}
	}

	private addEffectVariants(
		variants: RecipeVariant[],
		recipe: Recipe,
		machine: Machine,
		features: MachineFeature[],
	) {
		let clockChoices: EffectChoice[] = [];

		// over/underclocking
		for (const feature of features) {
			const effects = this.machineEffects.filter(
				x => feature.effectPerSlot.includes(x.id) && !x.perSlot,
			);

			for (const effect of effects) {
				const modifiable = effect.modifiers.find(m => m.modifiable);
				if (modifiable) {
					const stepSize = 0.1;
					const range = modifiable.maxValue! - modifiable.minValue!;
					const stepCount = range / stepSize;

					for (let i = 0; i <= stepCount; i++) {
						const value = +(modifiable.minValue! + i * stepSize).toFixed(1);
						if (value === 1 || value === 0) continue;
						let choice = { effect: effect, scaling: value };
						variants.push(this.calculateRecipeVariant(recipe, machine, [choice]));
						clockChoices.push(choice);
					}
				}
			}
		}

		// summerslooping
		for (const feature of features) {
			const effects = this.machineEffects.filter(
				x => feature.effectPerSlot.includes(x.id) && !x.perSlot,
			);
			for (const effect of effects) {
				const modifiable = effect.modifiers.find(m => m.modifiable);
				if (!modifiable) {
					for (let i = 1; i <= feature.itemSlots; i++) {
						const boostRatio = i / feature.itemSlots;
						const choice = { effect: effect, scaling: boostRatio };
						variants.push(this.calculateRecipeVariant(recipe, machine, [choice]));

						for (const clockChoice of clockChoices)
							variants.push(
								this.calculateRecipeVariant(recipe, machine, [choice, clockChoice]),
							);
					}
				}
			}
		}
	}

	getAllModuleCombinations(availableModules: EffectModule[], slots: number): EffectChoice[][] {
		if (slots === 0) return [[]];

		const results: EffectChoice[][] = [];
		const currentCombo: EffectChoice[] = [];

		function findCombinations(start: number) {
			if (currentCombo.length === slots) {
				results.push([...currentCombo]);
				return;
			}

			for (let i = start; i < availableModules.length; i++) {
				currentCombo.push({ effect: availableModules[i], scaling: 1 });
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
		effects: EffectChoice[],
	): RecipeVariant {
		let speed = machine.getBaseCraftingSpeed(this.machineEffects);
		let power = machine.getPowerConsumption(effects);
		let productivity = 1;
		effects.forEach(choice => {
			choice.effect.modifiers.forEach(modifier => {
				if (
					modifier.id === 'speed' &&
					modifier.onlyOutputScales === true &&
					!modifier.modifiable
				) {
					if (!choice.effect.perSlot) {
						productivity *= modifier.value! * choice.scaling;
					} else {
						productivity *= modifier.value!;
					}
				} else if (modifier.id === 'speed' && modifier.modifiable) {
					speed *= choice.scaling;
				} else if (modifier.id === 'speed') {
					speed *= modifier.value!;
				}
			});
		});

		return {
			id: nanoid(),
			highsId: 'x' + this.nextHighsId(),
			recipeId: recipe.id,
			recipePriority: recipe.priority,
			machineId: machine.id,
			in: recipe.in.map(x => ({
				...x,
				amount: ((x.amount * speed) / recipe.duration) * this.settings.defaultDuration,
			})),
			out: recipe.out.map(x => ({
				...x,
				amount:
					((x.amount * productivity * speed) / recipe.duration) *
					this.settings.defaultDuration,
			})),
			requiredPower: power,
			usedEffectModuleIds: effects.map(x => ({
				id: nanoid(),
				effectId: x.effect.id,
				scaling: x.scaling,
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
}

import EffectModule, { type EffectModuleInterface } from '@/lib/models/effect';
import Item, { type ItemInterface } from '@/lib/models/item';
import Machine, { MachineFeature, type MachineInterface } from '@/lib/models/machine';
import Recipe, {
	type RecipeInterface,
	type RecipeVariant,
	type RequestedBaseItemIo,
} from '@/lib/models/recipe';
import Research, { type ResearchInterface } from '@/lib/models/research';
import solver, { type Model, type SolveResult } from 'javascript-lp-solver';
import { nanoid } from 'nanoid';

export interface ProfileInterface {
	id: string;
	name: string;
	items: ItemInterface[];
	recipes: RecipeInterface[];
	machines: MachineInterface[];
	machineEffects: EffectModuleInterface[];
	research: ResearchInterface[];
}

interface OptimizationWeights {
	power: number;
	building: number;
	priority: number;
}

export interface OptimizationRequestInterface {
	id: string;
	in: RequestedBaseItemIo[];
	out: RequestedBaseItemIo[];
	duration: number;
	allowedEffectmodules: EffectModule[];
	limitations: string[];
	weights: OptimizationWeights;
	tolerance: number;
}

export class OptimizationRequest {
	id: string;
	in: RequestedBaseItemIo[];
	out: RequestedBaseItemIo[];
	duration: number;
	allowedEffectmodules: EffectModule[];
	limitations: string[];
	weights: OptimizationWeights;
	tolerance: number;

	constructor(request: OptimizationRequestInterface) {
		this.id = request.id;
		this.in = request.in;
		this.out = request.out;
		this.duration = request.duration;
		this.allowedEffectmodules = request.allowedEffectmodules;
		this.limitations = request.limitations;
		this.weights = request.weights;
		this.tolerance = 0.05;
	}

	getAllItemIds(): string[] {
		return [...this.in, ...this.out].map(x => x.id);
	}
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
				const range = modifiable.max_value! - modifiable.min_value!;
				const stepSize = range / stepCount;

				for (let i = 0; i <= stepCount; i++) {
					const value = modifiable.min_value! + i * stepSize;
					variants.push(this.calculateRecipeVariant(recipe, machine, [effect], value));
				}
			} else {
				// summerslooping
				for (let i = 1; i <= feature.itemSlots; i++) {
					const boostRatio = i / feature.itemSlots;
					variants.push(
						this.calculateRecipeVariant(recipe, machine, [effect], boostRatio),
					);
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
		let power = machine.getPowerConsumptionWithEffects(effects, scaling);
		let productivity = 1;
		// maybe switch to nanoid id
		let id = `${recipe.id}__${machine.id}`;
		if (effects.length > 0) {
			id += `__${effects.map(x => x.id).join('__')}`;
		}
		if (scaling !== 1) {
			id += `__${scaling}`;
		}
		effects.forEach(effect => {
			effect.modifiers.forEach(modifier => {
				if (
					modifier.id === 'speed' &&
					modifier.onlyOutputScales === true &&
					!modifier.modifiable
				) {
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
			id: id,
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

	calculateOptimalRecipeChain(request: OptimizationRequest): RecipeVariant[] | undefined {
		const requestedItems = request.getAllItemIds();
		const requestedInputItems = request.in.map(x => x.id);

		if (!this.allItemIdsExist(requestedItems)) {
			console.log(this.getMissingItemIds(requestedItems).join(', ') + ' do not exist');
			return;
		}

		const model: Model = {
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

		// net production of each item should be >= 0, (for the target item == targetAmount)
		this.items
			.filter(x => !requestedItems.includes(x.id))
			.forEach(x => (model.constraints[x.id] = { min: 0 }));
		request.in.forEach(item => {
			if (item.exact) {
				model.constraints[item.id] = { equal: 1 };
			} else {
				model.constraints[item.id] = {
					max: 1,
					min: 0.000001,
				};
			}
		});
		if (request.in.length !== 0 && request.out.length > 1) {
			console.log('can only maximize one output item');
			return;
		}
		request.out.forEach(item => {
			if (request.in.length !== 0 && item.amount === 0) {
				model.optimize = item.id;
				model.opType = 'max';
			}
			if (request.in.length)
				if (item.exact) {
					model.constraints[item.id] = { equal: item.amount / request.duration };
				} else {
					model.constraints[item.id] = {
						min: (item.amount / request.duration) * (1 - request.tolerance),
					};
				}
		});

		const variants = this.generateRecipeVariants();
		if (request.in.length !== 0) {
			// add pseudovariant if user says they have a spare amount of some ressource
			variants.push({
				id: 'requested-inputs',
				recipeId: 'requested-inputs',
				recipePriority: 0,
				machineId: '',
				in: [],
				out: request.in,
				requiredPower: 0,
				usedEffectModuleIds: [],
			});
		}
		variants.forEach(variant => {
			const recipeVar: any = {};
			if (
				variant.out.find(
					x => requestedInputItems.includes(x.id) && variant.id !== 'requested-inputs',
				)
			) {
				return;
			}
			this.items.forEach(item => {
				const input = variant.in.find(x => x.id === item.id);
				if (input) {
					recipeVar[item.id] = -input.amount;
				}

				const output = variant.out.find(x => x.id === item.id);
				if (output) {
					recipeVar[item.id] = output.amount;
				}
			});

			// cut the power down to MW, otherwise the cost get's way too high
			const powerCost = (request.weights.power * variant.requiredPower) / 1_000_000;

			// priority needs a really hard penality. Alternate recipes in satisfactory
			// bloat the result up by a lot: 40 vs 60+ for turbo-motors
			const priorityCost = Math.pow(variant.recipePriority, request.weights.priority);
			const buildingCost = request.weights.building;
			recipeVar.cost = powerCost + priorityCost + buildingCost;

			model.variables[variant.id] = recipeVar;
			model.ints![variant.id] = 1;
		});

		const solved = solver.Solve(model) as SolveResult | undefined;

		if (solved === undefined) {
			return;
		}
		if (!solved.feasible) {
			console.log('not feasible');
			return;
		}

		const recipes = Object.fromEntries(
			Object.entries(solved).filter(
				([k, v]) =>
					!['feasible', 'result', 'bounded', 'isIntegral'].includes(k) &&
					typeof v === 'number',
			),
		);
		let selectedVaritans: RecipeVariant[] = [];
		Object.entries(recipes).forEach(([id, amount]) => {
			let variant = variants.find(x => x.id === id);
			if (variant && typeof amount === 'number') {
				variant.amount = amount;
				selectedVaritans.push(variant);
			}
		});
		return selectedVaritans;
	}

	getItemById(id: string): Item | undefined {
		return this.items.find(x => x.id == id);
	}

	allItemIdsExist(ids: string[]): boolean {
		return ids.every(id => this.items.some(x => x.id === id));
	}

	getMissingItemIds(ids: string[]): string[] {
		return ids.filter(id => !this.items.some(x => x.id === id));
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

	getMachinesByRecipe(recipeCategory: string): Machine[] {
		return this.machines.filter(x => x.recipeCategories.includes(recipeCategory));
	}

	getMachineById(id: string) {
		return this.machines.find(x => x.id === id);
	}
}

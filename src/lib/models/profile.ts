import Machine, { type MachineInterface } from '@/lib/models/machine';
import Item, { type ItemInterface } from '@/lib/models/item';
import Recipe, { type RecipeInterface, type RecipeVariant } from '@/lib/models/recipe';
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
		const variants: RecipeVariant[] = [];
		this.recipes
			.filter(x => x.craftable !== false && x.available)
			.forEach(recipe => {
				const machines = this.getMachinesByRecipe(recipe.category).filter(x => x.available);
				if (machines.length === 0 && recipe.category === 'manual-harvest') {
					console.log(
						'Recipe: ' +
							recipe.id +
							' with category ' +
							recipe.category +
							' has no machines available',
					);
				}
				machines.forEach(machine => {
					// default, no effects
					variants.push(this.calculateRecipeVariant(recipe, machine, [], 1));

					// for over/underclocking
					const stepCount = 16;

					const allowedModules = machine.getAllowedEffectMoules(this.machineEffects);
					allowedModules.forEach(module => {
						if (module.id.includes('crafting-speed')) {
							return;
						}
						const modifiable = module.modifiers.find(x => x.modifiable);
						if (modifiable) {
							const steps =
								(modifiable.max_value! - modifiable.min_value!) / stepCount;
							for (let i = 0; i <= stepCount; i++) {
								variants.push(
									this.calculateRecipeVariant(
										recipe,
										machine,
										[module],
										modifiable.min_value! + i * steps,
									),
								);
							}
						} else {
							variants.push(
								this.calculateRecipeVariant(recipe, machine, [module], 1),
							);
						}
					});
				});
			});
		console.log(variants);
		return variants;
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
		let id = `${recipe.id}__${machine.id}`;
		if (effects.length > 0) {
			id += `__${effects.map(x => x.id).join('_')}`;
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
					productivity *= modifier.value!;
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
			usedEffectModuleIds: effects.map(x => x.id),
		};
	}

	calculateOptimalRecipeChain(
		itemId: string,
		targetAmount: number,
		duration: number,
		weights: { power: number; building: number; priority: number },
	): Record<string, number> | undefined {
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
				branching: 'strong',
			},
			ints: {},
			tolerance: 0.05,
		};

		// net production of each item should be >= 0, (for the target item == targetAmount)
		this.items.filter(x => x.id != itemId).forEach(x => (model.constraints[x.id] = { min: 0 }));
		model.constraints[itemId] = { equal: targetAmount };

		const variants = this.generateRecipeVariants();
		variants.forEach(variant => {
			const recipeVar: any = {};

			this.items.forEach(item => {
				const input = variant.in.find(x => x.id === item.id);
				if (input) {
					recipeVar[item.id] = -input.amount * duration;
				}

				const output = variant.out.find(x => x.id === item.id);
				if (output) {
					recipeVar[item.id] = output.amount * duration;
				}
			});

			// cut the power down to MW, otherwise the cost get's way too high
			const powerCost = (weights.power * variant.requiredPower) / 1_000_000;

			// priority needs a really hard penality. Alternate recipes in satisfactory
			// bloat the result up by a lot: 40 vs 60+ for turbo-motors
			const priorityCost = Math.pow(variant.recipePriority, weights.priority);
			const buildingCost = weights.building * 1;
			recipeVar.cost = powerCost + priorityCost + buildingCost;
			model.variables[variant.id] = recipeVar;

			// would allow optimizing for whole numbers but is 1. way slower & 2. increases the target
			// amount or starts rounding numbers...
			// model.ints![variant.id] = 1;
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
		) as Record<string, number>;
		return recipes;
	}

	generateMermaidGraph(result: Record<string, number>): string {
		let variants = this.generateRecipeVariants();
		const activeVariants = Object.keys(result).map(id => variants.find(x => x.id === id)!);

		let mermaid = 'graph LR\n';

		activeVariants.forEach(variant => {
			const rate = (result as any)[variant.id].toFixed(2);
			const safeId = variant.id.replace(/\s+/g, '_');
			mermaid += `    ${safeId}["${variant.id}<br/>(Rate: ${rate}/s)"]\n`;
		});

		// Create Edges based on item flow
		activeVariants.forEach(producer => {
			producer.out.forEach(output => {
				const consumers = activeVariants.filter(c =>
					c.in.some(input => input.id === output.id),
				);

				consumers.forEach(consumer => {
					const pId = producer.id.replace(/\s+/g, '_');
					const cId = consumer.id.replace(/\s+/g, '_');
					mermaid += `    ${pId} -- "${output.id}" --> ${cId}\n`;
				});
			});
		});

		return mermaid;
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

	getEffectModuleById(id: string): EffectModule | undefined {
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
}

import Machine, { type MachineConfiguration, type MachineInterface } from '@/lib/models/machine';
import Item, { type ItemInterface } from '@/lib/models/item';
import Recipe, {
	type RecipeInterface,
	type RecipeVariant,
	type RequestedBaseItemIo,
} from '@/lib/models/recipe';
import EffectModule, { type EffectModuleInterface } from '@/lib/models/effect';
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

interface VisualRepresentation {
	nodes: RecipeNode[];
	edges: Edge[];
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

interface RecipeNode {
	id: string;
	recipeId: string;
	machines: MachineConfiguration[];
}

interface Edge {
	from: string;
	to: string;
	itemId: string;
	amount: number;
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
				if (machines.length === 0) {
					// console.log(
					// 	'Recipe: ' +
					// 		recipe.id +
					// 		' with category ' +
					// 		recipe.category +
					// 		' has no machines available',
					// );
				}
				machines.forEach(machine => {
					// default, no effects
					variants.push(this.calculateRecipeVariant(recipe, machine, [], 1));

					// for over/underclocking
					const stepCount = 32;
					machine.features.forEach(f => {
						if (f.hidden === true) {
							return;
						}
						const allowedModules = f.effectPerSlot;
						const slots = f.itemSlots;
						// true for modules
						if (f.effectPerSlot && slots > 0) {
							// the normal factorio effects
							const perSlotEffects = this.machineEffects.filter(
								x =>
									allowedModules.includes(x.id) &&
									!x.id.includes('quality') &&
									x.perSlot,
							);
							const comb = this.getAllModuleCombinations(perSlotEffects, slots);
							comb.forEach(c => {
								variants.push(this.calculateRecipeVariant(recipe, machine, c, 1));
							});

							// e.g summerslooping across 1, 2 or 4 slots
							const effects = this.machineEffects.filter(
								x => allowedModules.includes(x.id) && !x.perSlot,
							);

							effects.forEach(effect => {
								const modifiable = effect.modifiers.find(x => x.modifiable);
								if (modifiable) {
									// under/overclocking
									const steps =
										(modifiable.max_value! - modifiable.min_value!) / stepCount;
									for (let i = 0; i <= stepCount; i++) {
										variants.push(
											this.calculateRecipeVariant(
												recipe,
												machine,
												[effect],
												modifiable.min_value! + i * steps,
											),
										);
									}
								} else {
									// summerslooping
									for (let i = 1; i <= slots; i++) {
										variants.push(
											this.calculateRecipeVariant(
												recipe,
												machine,
												[effect],
												i / slots,
											),
										);
									}
								}
							});
						}
					});
				});
			});
		return variants;
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
				//tolerance: 0.05,
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
					min: 0,
				};
			}
		});
		request.out.forEach(item => {
			if (item.exact) {
				model.constraints[item.id] = { equal: item.amount / request.duration };
			} else {
				model.constraints[item.id] = {
					min: (item.amount / request.duration) * (1 - request.tolerance),
				};
			}
		});

		const variants = this.generateRecipeVariants();
		console.log(variants);
		variants.forEach(variant => {
			const recipeVar: any = {};

			this.items.forEach(item => {
				const input = variant.in.find(x => x.id === item.id);
				if (input) {
					recipeVar[item.id] = -input.amount;
				}

				const output = variant.out.find(x => x.id === item.id);
				if (output && !requestedInputItems.includes(output.id)) {
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

		request.in.forEach(x => {
			const recipeVar: any = {};
			recipeVar[x.id] = x.amount;
			recipeVar.cost = 0;
			model.variables['requested-inputs'] = recipeVar;
			if (x.exact) {
				model.ints!['requested-inputs'] = 1;
			}
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

	generateNodes(usedVariants: RecipeVariant[]): VisualRepresentation {
		// cluster the variants first to each recipe. So e.g two different
		// machine configs for the same recipe end up in the same node later
		let nodeMap: Record<string, RecipeNode> = {};

		usedVariants.forEach(variant => {
			nodeMap[variant.recipeId] ??= {
				id: nanoid(),
				recipeId: variant.recipeId,
				machines: [],
			};
			nodeMap[variant.recipeId].machines.push({
				id: variant.machineId,
				machineId: variant.machineId,
				usedEffects: variant.usedEffectModuleIds,
				amount: variant.amount!,
			});
		});

		const supplyMap: Record<string, { recipeId: string; amount: number }[]> = {};
		const demandMap: Record<string, { recipeId: string; amount: number }[]> = {};
		usedVariants.forEach(variant => {
			variant.in.forEach(io => {
				if (!demandMap[io.id]) demandMap[io.id] = [];
				demandMap[io.id].push({
					recipeId: variant.recipeId,
					amount: io.amount * variant.amount!,
				});
			});
			variant.out.forEach(io => {
				if (!supplyMap[io.id]) supplyMap[io.id] = [];
				supplyMap[io.id].push({
					recipeId: variant.recipeId,
					amount: io.amount * variant.amount!,
				});
			});
		});

		let edgeMap: Record<string, Edge[]> = {};

		Object.entries(demandMap).forEach(([itemId, consumers]) => {
			const producers = [...(supplyMap[itemId] || [])];

			consumers.forEach(consumer => {
				let needed = consumer.amount;

				while (needed > 0 && producers.length > 0) {
					const producer = producers[0];
					const take = Math.min(needed, producer.amount);

					if (take > 0) {
						const producerId = nodeMap[producer.recipeId].id;
						const consumerId = nodeMap[consumer.recipeId].id;
						if (!edgeMap[producer.recipeId]) edgeMap[producer.recipeId] = [];
						const existing = edgeMap[producer.recipeId].find(
							e =>
								e.from === producerId && e.to === consumerId && e.itemId === itemId,
						);
						if (existing) existing.amount += take;
						else
							edgeMap[producer.recipeId].push({
								from: producerId,
								to: consumerId,
								itemId,
								amount: take,
							});

						needed -= take;
						producer.amount -= take;
					}

					if (producer.amount <= 0) {
						producers.shift();
					}
				}
			});
		});

		return { nodes: Object.values(nodeMap), edges: Object.values(edgeMap).flat() };
	}

	generateMermaidGraph(usedVariants: RecipeVariant[]): string {
		let mermaid = 'graph LR\n';

		usedVariants.forEach(variant => {
			const rate = variant.amount;
			const safeId = variant.id.replace(/\s+/g, '_');
			mermaid += `    ${safeId}["${variant.id}<br/>(Rate: ${rate}/s)"]\n`;
		});

		// Create Edges based on item flow
		usedVariants.forEach(producer => {
			producer.out.forEach(output => {
				const consumers = usedVariants.filter(c =>
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

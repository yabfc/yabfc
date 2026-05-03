<script lang="ts">
	import { recalculateEdgeAmounts } from '@/lib/factory/edge';
	import { calculateInput, calculateOutput, getRecipes } from '@/lib/factory/factory';
	import { propagateResources, type PropagationDirection } from '@/lib/factory/propagation';
	import { formattedLimitations } from '@/lib/format/limitation';
	import type { MachineConfiguration, RecipeNode, RecipeNodeData } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import alerts from '@/stores/alerts.svelte';
	import factory from '@/stores/factory.svelte';
	import {
		FactoryIcon,
		PencilIcon,
		PlusIcon,
		Trash2Icon,
		SendHorizontalIcon,
	} from '@lucide/svelte';
	import { Handle, Position, type Node, type NodeProps } from '@xyflow/svelte';
	import { nanoid } from 'nanoid';

	let {
		data,
		targetPosition = Position.Left,
		sourcePosition = Position.Right,
	}: NodeProps<Node<RecipeNodeData>> = $props();

	let recipe = $derived(active.profile?.getRecipeById(data.recipeNode.recipeId));

	let node = $derived<RecipeNode | undefined>(factory.recipeNodes[data.recipeNode.id]);

	type ResourceAmountRow = {
		itemId: string;
		used: number;
		capacity: number;
	};

	function toResourceRows(
		usedAmounts: Record<string, number>,
		capacityAmounts: Record<string, number>,
	): ResourceAmountRow[] {
		const itemIds = new Set([...Object.keys(capacityAmounts), ...Object.keys(usedAmounts)]);
		return [...itemIds].map(itemId => ({
			itemId,
			used: usedAmounts[itemId] ?? 0,
			capacity: capacityAmounts[itemId] ?? 0,
		}));
	}

	let inputRows = $derived(toResourceRows(data.usedInputs, calculateInput(active.profile, node))),
		outputRows = $derived(
			toResourceRows(data.usedOutputs, calculateOutput(active.profile, node)),
		);

	let utilizationPercent = $derived.by(() => {
		if (inputRows.length > 0) {
			return (inputRows[0].used / inputRows[0].capacity) * 100;
		} else {
			return (outputRows[0].used / outputRows[0].capacity) * 100;
		}
	});

	const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });

	let selectedMachine = $state<string>();
	const addMachine = () => {
		if (!selectedMachine || !node || !active.profile) return;
		const machine = active.profile.getMachineById(selectedMachine);
		if (!machine) return;

		node.machines.push({
			id: nanoid(),
			machineId: selectedMachine,
			machineCount: 1,
			productivityOverride: 1,
			speedOverride: 1,
			speed: machine.baseCraftingSpeed,
			productivity: 1,
			effects: [],
		});
		recalculateEdgeAmounts(active.profile, factory);
	};

	function updateMachineConfig(config: MachineConfiguration) {
		if (!active.profile) return;
		if (config.machineCount < 0) {
			config.machineCount = 0;
			alerts.push("You can't have less than 0 machines");
		}
		recalculateEdgeAmounts(active.profile, factory);
	}

	function propagateNodeResources(direction: PropagationDirection) {
		if (!node || !active.profile) return;
		propagateResources(active.profile, factory, node.id, direction);
	}

	function deleteMachine(config: MachineConfiguration) {
		if (!node || !active.profile) return;
		node.machines = node.machines.filter(x => x !== config);
		recalculateEdgeAmounts(active.profile, factory);
	}

	function openMachineConfigDialog(config: MachineConfiguration) {
		data.onEditMachineConfig(config);
	}

	let alternatives = $derived.by(() => {
		if (!active.profile) return undefined;

		// todo handle multiple recipe outputs
		if (!recipe) return undefined;

		const recipes = getRecipes(active.profile, recipe.out[0].id);
		if (recipes.length === 1) return undefined;

		return recipes;
	});

	let selectedAlternativeRecipeId = $state('');

	function handleAlternativeChange() {
		if (!selectedAlternativeRecipeId) return;
		data.onRecipeChange(data.recipeNode.id, selectedAlternativeRecipeId);
		selectedAlternativeRecipeId = '';
	}
</script>

{#if inputRows.length !== 0}
	<Handle
		type="target"
		position={targetPosition}
		class="border-base-content/50 rounded-full border [--xy-handle-background-color:color-mix(in_oklab,var(--color-base-content)_50%,transparent)]"
	/>
{/if}
<div
	class="rounded-box bg-base-100 border-base-content/10 flex w-72 flex-col items-center gap-1 border p-4"
>
	<div class="flex w-full items-center gap-2">
		<div
			class="tooltip tooltip-bottom leading-tight before:text-xs before:transition-none after:transition-none"
			// transition is set to none since the tooltip 'tail' moves slighltly to the left when opening the tooltip. Very unsatisfying
			data-tip="Utilization"
		>
			<span
				class={{
					'badge badge-xs min-h-5': true,
					'bg-success/50': Math.abs(utilizationPercent - 100) < 1e-9,
					'bg-warning/50': Math.abs(utilizationPercent - 100) >= 1e-9,
				}}
			>
				{formatter.format(utilizationPercent)}%
			</span>
		</div>
		{#if alternatives}
			<div class="ml-auto w-40 shrink-0">
				<p class="sr-only">Select recipe alternative</p>

				<select
					id={nanoid()}
					class="select select-xs nodrag"
					bind:value={selectedAlternativeRecipeId}
					onchange={handleAlternativeChange}
				>
					<option disabled value="">Select alternative</option>

					{#each alternatives as r}
						<option value={r.id}>
							{r.getDisplayName()}
						</option>
					{/each}
				</select>
			</div>
		{:else}
			<span></span>
		{/if}
	</div>
	<FactoryIcon size="32" class="text-secondary/70" />

	<span class="w-full overflow-hidden text-center text-lg font-bold text-ellipsis">
		{recipe?.getDisplayName() || data.recipeNode.recipeId}
	</span>

	<div class="flex w-full flex-col gap-2 p-2 text-xs">
		<p class="text-base-content/50 font-bold uppercase">Input</p>

		<ul>
			{#each inputRows as input}
				<li class="text-base-content/80 flex gap-2">
					<span class="min-w-0 flex-1 truncate">
						{active.profile?.getItemById(input.itemId)?.getDisplayName()}
					</span>
					<span class="shrink-0 text-right">
						{formatter.format(input.used)} / {formatter.format(input.capacity)}
					</span>
				</li>
			{:else}
				<li class="text-base-content/80">No input available</li>
			{/each}
		</ul>

		<p class="text-base-content/50 font-bold uppercase">Output</p>

		<ul>
			{#each outputRows as output}
				<li class="text-base-content/80 flex gap-2">
					<span class="min-w-0 flex-1 truncate">
						{active.profile?.getItemById(output.itemId)?.getDisplayName()}
					</span>
					<span class="shrink-0 text-right">
						{formatter.format(output.used)} / {formatter.format(output.capacity)}
					</span>
				</li>
			{:else}
				<li class="text-base-content/80">No output available</li>
			{/each}
		</ul>
	</div>

	<ul
		class="border-base-content/10 text-base-content/80 flex w-full flex-col gap-1 border-t pt-2 text-sm"
	>
		{#snippet factory(name: string, config: MachineConfiguration)}
			<li class="flex flex-col gap-2">
				<p class="flex-1 text-sm">{name}</p>

				<div class="flex items-center gap-2">
					<label id={config.id} class="floating-label flex-1">
						<span>Amount</span>
						<input
							id={config.id}
							type="number"
							bind:value={config.machineCount}
							onchange={() => updateMachineConfig(config)}
							min="1"
							step="1"
							class="input input-sm nodrag nopan w-full"
						/>
					</label>

					<button
						class="btn btn-ghost btn-xs btn-square shrink-0"
						onclick={() => openMachineConfigDialog(config)}
					>
						<PencilIcon size="12" />
					</button>

					<button
						class="btn btn-ghost btn-xs btn-square text-error shrink-0"
						onclick={() => deleteMachine(config)}
					>
						<Trash2Icon size="12" />
					</button>
				</div>
			</li>
		{/snippet}

		{#each node?.machines || [] as machine}
			{@render factory(
				active.profile?.getMachineById(machine.machineId)?.getDisplayName() ??
					'Unknown Machine',
				machine,
			)}
		{:else}
			<p class="text-xs text-center text-base-content/60">No machines added</p>
		{/each}
	</ul>

	{#if recipe && recipe.limitations}
		{#each formattedLimitations(recipe.limitations) as limit}
			<div class="alert alert-warning alert-soft mt-2 w-full py-1 text-xs">
				<span class="-ml-1">{limit}</span>
			</div>
		{/each}
	{/if}
	<div class="join w-full pt-2">
		<select
			id={nanoid()}
			bind:value={selectedMachine}
			class="select select-xs join-item nodrag"
		>
			{#each active.profile?.getMachinesByRecipe(recipe?.category || '') as machine}
				<option value={machine.id}>{machine.getDisplayName()}</option>
			{:else}
				<option disabled value={undefined}>No machine available</option>
			{/each}
		</select>

		<button onclick={addMachine} class="btn btn-xs btn-soft join-item"
			><PlusIcon size="13" />
		</button>
	</div>
	<div
		class="border-base-content/10 mt-2 grid w-full grid-cols-[1fr_auto_1fr] items-center border-t pt-2"
	>
		{#if inputRows.length !== 0}
			<button
				type="button"
				class="btn btn-xs nodrag nopan items-center gap-1 justify-self-start"
				onclick={() => propagateNodeResources('left')}
			>
				<SendHorizontalIcon class="size-3.5 rotate-180" />
				<span class="leading-none">Left</span>
			</button>
		{:else}
			<span></span>
		{/if}
		<span class="text-base-content/50 text-xs"> Propagate </span>

		<button
			type="button"
			class="btn btn-xs nodrag nopan items-center gap-1 justify-self-end"
			onclick={() => propagateNodeResources('right')}
		>
			<span>Right</span>
			<SendHorizontalIcon class="size-3.5" />
		</button>
	</div>
</div>
<Handle
	type="source"
	position={sourcePosition}
	class="border-base-content/50 rounded-full border [--xy-handle-background-color:color-mix(in_oklab,var(--color-base-content)_50%,transparent)]"
/>

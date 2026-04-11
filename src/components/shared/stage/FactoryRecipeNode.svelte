<script lang="ts">
	import { recalculateEdgeAmounts } from '@/lib/factory/edge';
	import { calculateInput, calculateOutput, getRecipes } from '@/lib/factory/factory';
	import type { MachineConfiguration, RecipeNode, RecipeNodeData } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import factory from '@/stores/factory.svelte';
	import { FactoryIcon, PencilIcon, PlusIcon, Trash2Icon } from '@lucide/svelte';
	import { Handle, Position, type Node, type NodeProps } from '@xyflow/svelte';

	let {
		data,
		targetPosition = Position.Left,
		sourcePosition = Position.Right,
	}: NodeProps<Node<RecipeNodeData>> = $props();

	let recipe = $derived(active.profile?.getRecipeById(data.recipeNode.recipeId));

	let node = $derived<RecipeNode | undefined>(factory.recipeNodes[data.recipeNode.id]);

	let actualInputs = $derived(calculateInput(active.profile, node)),
		actualOutputs = $derived(calculateOutput(active.profile, node));

	let targetInputs = $derived(data.targetInputs),
		targetOutputs = $derived(data.targetOutputs);

	const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });

	let machine = $state<string>();
	const addMachine = () => {
		if (!machine || !node || !active.profile) return;

		node.machines.push({
			machineId: machine,
			machineCount: 1,
			productivityOverride: 1,
			speedOverride: 1,
			speed: 1,
			productivity: 1,
			effects: [],
		});
		recalculateEdgeAmounts(active.profile, factory);
	};

	const updateMachineConfig = () => {
		if (!active.profile) return;
		recalculateEdgeAmounts(active.profile, factory);
	};

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

{#if Object.keys(actualInputs).length !== 0}
	<Handle
		type="target"
		position={targetPosition}
		class="border-base-content/50 rounded-full border [--xy-handle-background-color:color-mix(in_oklab,var(--color-base-content)_50%,transparent)]"
	/>
{/if}
<div
	class="rounded-box bg-base-100 border-base-content/10 flex w-72 flex-col items-center gap-1 border p-4"
	class:pt-10={alternatives}
>
	<FactoryIcon size="32" class="text-secondary/70" />

	<span class="w-full overflow-hidden text-center text-lg font-bold text-ellipsis">
		{recipe?.getDisplayName() || data.recipeNode.recipeId}
	</span>

	{#if alternatives}
		<div class="absolute top-2 right-2 ml-2">
			<p class="sr-only">Select recipe alternative</p>

			<select
				class="select select-xs"
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
	{/if}

	<p class="text-base-content/75 flex self-start text-xs font-bold">Target production</p>
	<div class="flex w-full justify-between gap-2 p-2 text-xs">
		<div>
			<p class="text-base-content/50 font-bold uppercase">Input</p>

			<ul>
				{#each Object.entries(targetInputs) as input}
					<li class="text-base-content/80">
						{active.profile?.getItemById(input[0])?.getDisplayName()}:
						{formatter.format(input[1])}
					</li>
				{:else}
					<li class="text-base-content/80">No input available</li>
				{/each}
			</ul>
		</div>

		<div>
			<p class="text-base-content/50 font-bold uppercase">Output</p>

			<ul>
				{#each Object.entries(targetOutputs) as output}
					<li class="text-base-content/80">
						{active.profile?.getItemById(output[0])?.getDisplayName()}:
						{formatter.format(output[1])}
					</li>
				{:else}
					<li class="text-base-content/80">No output available</li>
				{/each}
			</ul>
		</div>
	</div>

	<p class="text-base-content/75 flex self-start text-xs font-bold">Actual production</p>
	<div class="flex w-full justify-between gap-2 p-2 text-xs">
		<div>
			<p class="text-base-content/50 font-bold uppercase">Input</p>

			<ul>
				{#each Object.entries(actualInputs) as input}
					<li class="text-base-content/80">
						{active.profile?.getItemById(input[0])?.getDisplayName()}:
						{formatter.format(input[1])}
					</li>
				{:else}
					<li class="text-base-content/80">No input available</li>
				{/each}
			</ul>
		</div>

		<div>
			<p class="text-base-content/50 font-bold uppercase">Output</p>

			<ul>
				{#each Object.entries(actualOutputs) as output}
					<li class="text-base-content/80">
						{active.profile?.getItemById(output[0])?.getDisplayName()}:
						{formatter.format(output[1])}
					</li>
				{:else}
					<li class="text-base-content/80">No output available</li>
				{/each}
			</ul>
		</div>
	</div>

	<ul class="text-base-content/80 flex w-full flex-col gap-1 text-sm">
		{#snippet factory(name: string, config: MachineConfiguration)}
			<li class="flex flex-col gap-2">
				<p class="flex-1 text-sm">{name}</p>

				<div class="flex items-center gap-2">
					<label class="floating-label flex-1">
						<span>Amount</span>
						<input
							type="number"
							bind:value={config.machineCount}
							onchange={updateMachineConfig}
							min="1"
							step="1"
							class="input input-sm w-full"
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

	<div class="join w-full pt-4">
		<select bind:value={machine} class="select select-xs join-item">
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
</div>

<Handle
	type="source"
	position={sourcePosition}
	class="border-base-content/50 rounded-full border [--xy-handle-background-color:color-mix(in_oklab,var(--color-base-content)_50%,transparent)]"
/>

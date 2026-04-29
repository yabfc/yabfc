<script lang="ts">
	import { getRecipeChain } from '@/lib/factory/factory';
	import active from '@/stores/active.svelte';
	import factory from '@/stores/factory.svelte';
	import ItemSelect from '@/components/shared/ItemSelect.svelte';
	import { ZapIcon } from '@lucide/svelte';
	import type Item from '@/lib/models/item';
	import { NumberFormatter } from '@/lib/format/number';
	import { connectEdges } from '@/lib/factory/edge';

	let inputs = $state<{ item: Item; amount: number }[]>([]),
		outputs = $state<{ item: Item; amount: number }[]>([]);

	const formatter = new NumberFormatter(undefined, { maximumFractionDigits: 3 });

	function clearFactory() {
		factory.edges = [];
		factory.inputs = {};
		factory.outputs = {};
		factory.recipeNodes = {};
	}

	async function calculate() {
		if (!active.profile) return;

		if (outputs.length === 0) {
			clearFactory();
			return;
		}

		factory.outputs = Object.fromEntries(
			outputs.map(io => [io.item.id, { id: io.item.id, amount: io.amount }]),
		);

		const recipeChain = getRecipeChain(
			active.profile,
			outputs.map(io => io.item.id),
			inputs.map(io => io.item.id),
		);

		factory.recipeNodes = Object.fromEntries(recipeChain.map(x => [x.id, x]));
		factory.inputs = Object.fromEntries(
			inputs.map(io => [io.item.id, { id: io.item.id, amount: io.amount }]),
		);

		factory.edges = connectEdges(
			active.profile,
			Object.values(factory.recipeNodes),
			Object.values(factory.inputs),
			Object.values(factory.outputs),
		);
	}

	const powerConsumption = $derived.by(() => {
		if (!active.profile) return 0;
		let power = 0;
		Object.values(factory.recipeNodes).forEach(node => {
			node.machines.forEach(config => {
				if (!active.profile) return;
				const machine = active.profile.getMachineById(config.machineId);
				if (!machine) return;
				power +=
					machine.getPowerConsumption(config.effects, active.profile.machineEffects) *
					config.machineCount;
			});
		});
		return power;
	});
</script>

<div
	class="fixed top-24 bottom-4 left-4 z-10 h-fit max-h-[calc(100%-var(--spacing)*28)] w-80 overflow-auto"
>
	<div class="rounded-box bg-base-200 p-2">
		<h2 class="text-xl font-bold">This Factory</h2>

		<fieldset class="fieldset bg-base-100 border-base-300 rounded-box min-w-0 border p-4">
			<legend class="fieldset-legend">Inputs</legend>

			<ItemSelect bind:items={inputs} />
		</fieldset>

		<fieldset class="fieldset bg-base-100 border-base-300 rounded-box border p-4">
			<legend class="fieldset-legend">Outputs</legend>

			<ItemSelect bind:items={outputs} />
		</fieldset>

		<ul class="py-2">
			<li class="px-2">
				<ZapIcon size="18" class="text-base-content/50 inline" />
				<span class="sr-only">Electricity</span>
				<b class="font-bold">{formatter.getPowerParts(powerConsumption ?? 0).value}</b>
				<span class="text-base-content/80"
					>{formatter.getPowerUnit(powerConsumption ?? 0)}</span
				>
			</li>
		</ul>

		<div class="flex flex-row-reverse gap-2 pt-2">
			<button onclick={calculate} class="btn btn-primary btn-soft">Calculate</button>
		</div>
	</div>
</div>

<script lang="ts">
	import FactoryCalculator from '@/lib/calculator/factory';
	import OptimizationRequest from '@/lib/calculator/optimization';
	import ItemSelect from '@/lib/components/shared/ItemSelect.svelte';
	import Item from '@/lib/models/item';
	import { generateNodes } from '@/lib/models/node';
	import active from '@/lib/stores/active.svelte';
	import alerts from '@/lib/stores/alerts.svelte';
	import { stage } from '@/lib/stores/stage.svelte';
	import { ZapIcon } from '@lucide/svelte';

	let inputs = $state<{ item: Item; amount: number }[]>([]),
		outputs = $state<{ item: Item; amount: number }[]>([]);

	function calculate() {
		if (!active.profile) return;

		const calculator = new FactoryCalculator(active.profile);

		let optimizationReq = new OptimizationRequest()
			.setInputs(
				inputs.map(x => ({
					id: x.item.id,
					amount: x.amount,
					exact: false,
				})),
			)
			.setOutputs(
				outputs.map(x => ({
					id: x.item.id,
					amount: x.amount,
					exact: false,
				})),
			)
			.setWeights({ power: 1, building: 1, priority: 100 })
			.setTolerance(0.05);

		// TODO provide visual feedback to user
		let res = calculator.calculate(optimizationReq);
		if (!res) return alerts.push('Failed to calculate factory', 'ERROR');

		const { nodes, edges } = generateNodes(res);

		stage.nodes = nodes;
		stage.edges = edges;
	}
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
				<b class="font-bold">13</b>
				<span class="text-base-content/80">MW</span>
			</li>
		</ul>

		<div class="flex flex-row-reverse gap-2 pt-2">
			<button onclick={calculate} class="btn btn-primary btn-soft">Calculate</button>
		</div>
	</div>
</div>

<script lang="ts">
	import ItemSelect from '@/lib/components/shared/ItemSelect.svelte';
	import Item from '@/lib/models/item';

	let inputs = $state<{ item: Item; amount: number }[]>([]),
		outputs = $state<{ item: Item; amount: number }[]>([]);

	function calculate() {
		//
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

		<div class="flex flex-row-reverse gap-2 pt-2">
			<button onclick={calculate} class="btn btn-primary btn-soft">Calculate</button>
		</div>
	</div>
</div>

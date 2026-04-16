<script lang="ts">
	import Dialog from '@/components/shared/Dialog.svelte';
	import { type Factory } from '@/lib/models/factory';
	import alerts from '@/stores/alerts.svelte';
	import factory from '@/stores/factory.svelte';
	import { CheckIcon, ClipboardCopyIcon, ImportIcon, TriangleAlertIcon } from '@lucide/svelte';

	let dialog = $state<HTMLDialogElement>();

	let factoryJson = $state('');

	const load = () => {
		factoryJson = JSON.stringify(factory);
	};

	export const open = () => {
		load();

		dialog?.showModal();
	};

	let copyPromise = $state<Promise<void>>(new Promise(() => {}));
	const copyToClipboard = () => {
		copyPromise = navigator.clipboard.writeText(factoryJson);

		setTimeout(() => (copyPromise = new Promise(() => {})), 2000);
	};

	const importFactory = (e: SubmitEvent) => {
		let newFactory: Factory;

		try {
			newFactory = JSON.parse(factoryJson);
		} catch {
			e.preventDefault();
			alerts.push('Failed to parse JSON for factory', 'ERROR');
			return;
		}

		factory.edges = newFactory.edges || [];
		factory.inputs = newFactory.inputs || {};
		factory.outputs = newFactory.outputs || {};
		factory.recipeNodes = newFactory.recipeNodes || {};
	};
</script>

<Dialog bind:dialog>
	<div class="flex justify-between gap-4">
		<h3 class="text-lg font-bold">
			<ImportIcon class="mr-2 inline" size="20" />
			Import / Export
		</h3>

		<div class="tooltip tooltip-left" data-tip="Copy to clipboard">
			<button onclick={copyToClipboard} class="btn btn-square btn-primary btn-soft">
				{#await copyPromise}
					<ClipboardCopyIcon size="20" />
					<span class="sr-only">Copy to clipboard</span>
				{:then}
					<CheckIcon size="20" class="text-success" />
					<span class="sr-only">Copied</span>
				{:catch}
					<TriangleAlertIcon size="20" class="text-error" />
					<span class="sr-only">Failed</span>
				{/await}
			</button>
		</div>
	</div>

	<form class="pt-4" method="dialog" onsubmit={importFactory}>
		<p class="text-base-content/80 text-xs">
			Paste your factory definition to import or copy to export.
		</p>

		<textarea
			placeholder="Here goes your factory JSON"
			class="textarea textarea-sm my-2 w-full"
			rows="20"
			bind:value={factoryJson}
		></textarea>

		<div class="flex flex-row-reverse">
			<button type="submit" class="btn btn-primary btn-soft">Import</button>
		</div>
	</form>
</Dialog>

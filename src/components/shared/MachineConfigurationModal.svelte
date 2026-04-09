<!--
@component
-->

<script lang="ts">
	import Dialog from '@/components/shared/Dialog.svelte';
	import type { MachineConfiguration } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';

	type Props = {
		dialog?: HTMLDialogElement;
		config?: MachineConfiguration;
		onChange: () => void;
	};

	let { dialog = $bindable(), config = $bindable(), onChange }: Props = $props();

	const machine = $derived(config ? active.profile?.getMachineById(config.machineId) : undefined);
</script>

<Dialog bind:dialog>
	{#if config}
		<h3 class="text-lg font-bold">Edit machine configuration</h3>

		<div class="text-base-content/60 pt-1 text-sm">
			{machine?.getDisplayName()}
		</div>

		<div class="flex flex-col gap-4 pt-4">
			<label class="floating-label">
				<span>Amount</span>
				<input
					type="number"
					bind:value={config.machineCount}
					onchange={onChange}
					min="1"
					step="1"
					class="input input-bordered w-full"
				/>
			</label>

			<label class="floating-label">
				<span>{active.profile?.getSpeedOverrideName()}</span>
				<input
					type="number"
					bind:value={config.speed}
					onchange={onChange}
					min="0"
					step="0.1"
					class="input input-bordered w-full"
				/>
			</label>

			<label class="floating-label">
				<span>{active.profile?.getProductivityOverrideName()}</span>
				<input
					type="number"
					bind:value={config.productivity}
					onchange={onChange}
					min="0"
					step="0.1"
					class="input input-bordered w-full"
				/>
			</label>
		</div>
	{/if}
</Dialog>

<script lang="ts">
	import FactoryPlanner from '@/components/factory/FactoryPlanner.svelte';
	import FactoryStage from '@/components/factory/FactoryStage.svelte';
	import OverviewWindow from '@/components/factory/overview/OverviewWindow.svelte';
	import MachineConfigurationModal from '@/components/shared/MachineConfigurationModal.svelte';
	import { recalculateEdgeAmounts } from '@/lib/factory/factory';
	import type { MachineConfiguration } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import factory from '@/stores/factory.svelte';
	import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/svelte';

	let machineConfigDialog = $state<HTMLDialogElement>();
	let editingMachineConfig = $state<MachineConfiguration | undefined>();

	function openMachineConfigDialog(config: MachineConfiguration) {
		editingMachineConfig = config;
		machineConfigDialog?.showModal();
	}

	function updateMachineConfig() {
		if (!active.profile) return;
		recalculateEdgeAmounts(active.profile, factory);
	}

	let overviewHidden = $state(false);
</script>

<FactoryPlanner />

<FactoryStage onEditMachineConfig={openMachineConfigDialog} />

<button
	type="button"
	class="btn btn-sm btn-circle fixed top-26 right-6 z-20 shadow"
	onclick={() => (overviewHidden = !overviewHidden)}
>
	{#if overviewHidden}
		<ChevronLeftIcon size="16" />
	{:else}
		<ChevronRightIcon size="16" />
	{/if}
</button>

{#if !overviewHidden}
	<OverviewWindow />
{/if}

<MachineConfigurationModal
	bind:dialog={machineConfigDialog}
	bind:config={editingMachineConfig}
	onChange={updateMachineConfig}
/>

<script lang="ts">
	import FactoryPlanner from '@/components/factory/FactoryPlanner.svelte';
	import FactoryStage from '@/components/factory/FactoryStage.svelte';
	import OverviewWindow from '@/components/factory/overview/OverviewWindow.svelte';
	import MachineConfigurationModal from '@/components/shared/MachineConfigurationModal.svelte';
	import EdgeModal from '@/components/shared/EdgeModal.svelte';
	import { recalculateEdgeAmounts } from '@/lib/factory/edge';
	import { type Edge, type MachineConfiguration } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import factory from '@/stores/factory.svelte';
	import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/svelte';

	let edgeDialog = $state<HTMLDialogElement>();
	let selectedEdge = $state<Edge | undefined>();
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

	function openEdgeDialog(edge: Edge) {
		selectedEdge = edge;
		edgeDialog?.showModal();
	}

	let overviewHidden = $state(false);
</script>

<FactoryPlanner />

<FactoryStage onEditMachineConfig={openMachineConfigDialog} onEdgeView={openEdgeDialog} />

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
<EdgeModal bind:dialog={edgeDialog} bind:edge={selectedEdge} />

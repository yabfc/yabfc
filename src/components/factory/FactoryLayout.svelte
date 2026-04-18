<script lang="ts">
	import FactoryPlanner from '@/components/factory/FactoryPlanner.svelte';
	import FactoryStage from '@/components/factory/FactoryStage.svelte';
	import OverviewWindow from '@/components/factory/overview/OverviewWindow.svelte';
	import MachineConfigurationDialog from '@/components/shared/MachineConfigurationDialog.svelte';
	import EdgeDialog from '@/components/shared/EdgeDialog.svelte';
	import { recalculateEdgeAmounts } from '@/lib/factory/edge';
	import { type Edge, type MachineConfiguration } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import factory from '@/stores/factory.svelte';

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
</script>

<FactoryPlanner />

<FactoryStage onEditMachineConfig={openMachineConfigDialog} onEdgeView={openEdgeDialog} />

<OverviewWindow />

<MachineConfigurationDialog
	bind:dialog={machineConfigDialog}
	bind:config={editingMachineConfig}
	onChange={updateMachineConfig}
/>
<EdgeDialog bind:dialog={edgeDialog} bind:edge={selectedEdge} />

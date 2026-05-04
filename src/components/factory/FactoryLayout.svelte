<script lang="ts">
	import FactoryPlanner from '@/components/factory/FactoryPlanner.svelte';
	import FactoryStage from '@/components/factory/FactoryStage.svelte';
	import OverviewWindow from '@/components/factory/overview/OverviewWindow.svelte';
	import MachineConfigurationDialog from '@/components/shared/stage/dialog/MachineConfigurationDialog.svelte';
	import EdgeDialog from '@/components/shared/stage/dialog/EdgeDialog.svelte';
	import { recalculateEdgeAmounts } from '@/lib/factory/edge';
	import { type Edge, type MachineConfiguration } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import factory from '@/stores/factory.svelte';
	import alerts from '@/stores/alerts.svelte';

	let edgeDialog = $state<HTMLDialogElement>(),
		selectedEdge = $state<Edge | undefined>(),
		machineConfigDialog = $state<HTMLDialogElement>(),
		machineConfigDialogOpen = $state(false),
		editingMachineConfig = $state<MachineConfiguration | undefined>();

	function openMachineConfigDialog(config: MachineConfiguration) {
		editingMachineConfig = config;
		// machineConfigDialog.open somehow was always falsy so we'll use some more state instead
		machineConfigDialogOpen = true;
		machineConfigDialog?.showModal();
	}

	function updateMachineConfig(config?: MachineConfiguration) {
		if (!active.profile || !config) return;
		if (config.machineCount < 0) {
			config.machineCount = 0;
			alerts.push("You can't have less than 0 machines");
		}
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
	bind:dialogOpen={machineConfigDialogOpen}
	onChange={updateMachineConfig}
/>
<EdgeDialog bind:dialog={edgeDialog} bind:edge={selectedEdge} />

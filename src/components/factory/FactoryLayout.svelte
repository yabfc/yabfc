<script lang="ts">
	import FactoryPlanner from '@/components/factory/FactoryPlanner.svelte';
	import FactoryStage from '@/components/factory/FactoryStage.svelte';
	import OverviewWindow from '@/components/factory/overview/OverviewWindow.svelte';
	import MachineConfigurationModal from '@/components/shared/MachineConfigurationModal.svelte';
	import { recalculateEdgeAmounts } from '@/lib/factory/factory';
	import type { MachineConfiguration } from '@/lib/models/factory';
	import active from '@/stores/active.svelte';
	import factory from '@/stores/factory.svelte';

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
</script>

<FactoryPlanner />

<FactoryStage onEditMachineConfig={openMachineConfigDialog} />

<OverviewWindow />

<MachineConfigurationModal
	bind:dialog={machineConfigDialog}
	bind:config={editingMachineConfig}
	onChange={updateMachineConfig}
/>

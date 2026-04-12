<script lang="ts">
	import ItemOverview from '@/components/factory/overview/ItemOverview.svelte';
	import MachineOverview from '@/components/factory/overview/MachineOverview.svelte';
	import RecipeOverview from '@/components/factory/overview/RecipeOverview.svelte';
	import ConveyorOverview from '@/components/factory/overview/ConveyorOverview.svelte';
	import EffectOverview from '@/components/factory/overview/EffectOverview.svelte';
	import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/svelte';
	const tabs = [
		{ label: 'Items', component: ItemOverview },
		{ label: 'Machines', component: MachineOverview },
		{ label: 'Recipes', component: RecipeOverview },
		{ label: 'Conveyors', component: ConveyorOverview },
		{ label: 'Effects', component: EffectOverview },
	];

	let activeTab = $state<string>('Items');
	let overviewHidden = $state(false);
</script>

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
	<div
		class="fixed top-24 right-4 bottom-4 z-10 flex h-fit max-h-[calc(100%-var(--spacing)*28)] w-80"
	>
		<div class="tabs tabs-box w-full shadow">
			{#each tabs as tab}
				{@const tabId = `profile-tab-${tab.label.toLowerCase()}`}

				<input
					type="radio"
					name="profile-overview-tabs"
					id={tabId}
					class="tab"
					aria-label={tab.label}
					checked={activeTab === tab.label}
					onchange={() => (activeTab = tab.label)}
				/>

				<div
					class="tab-content bg-base-100 border-base-300 h-[calc(100%-var(--tab-height)-var(--spacing)-46px)]! overflow-auto"
				>
					<tab.component />
				</div>
			{/each}
		</div>
	</div>
{/if}

<script lang="ts">
	import ItemOverview from '@/components/factory/overview/ItemOverview.svelte';
	import MachineOverview from '@/components/factory/overview/MachineOverview.svelte';
	import RecipeOverview from '@/components/factory/overview/RecipeOverview.svelte';
	import ConveyorOverview from './ConveyorOverview.svelte';
</script>

<div
	class="fixed top-24 right-4 bottom-4 z-10 flex h-fit max-h-[calc(100%-var(--spacing)*28)] w-80"
>
	<div class="tabs tabs-box w-full shadow">
		<input type="radio" name="profile-overview-tabs" class="tab" aria-label="Items" checked />

		<!--
			There might be a daisyUI bug for tabs-box which requires us to forcefully override the
			tab-content's height
		-->
		<div
			class="tab-content bg-base-100 border-base-300 !h-[calc(100%-var(--tab-height)-var(--spacing))] overflow-auto"
		>
			<ItemOverview />
		</div>

		<input type="radio" name="profile-overview-tabs" class="tab" aria-label="Machines" />
		<div
			class="tab-content bg-base-100 border-base-300 !h-[calc(100%-var(--tab-height)-var(--spacing))] overflow-auto"
		>
			<MachineOverview />
		</div>

		<input type="radio" name="profile-overview-tabs" class="tab" aria-label="Recipes" />
		<div
			class="tab-content bg-base-100 border-base-300 !h-[calc(100%-var(--tab-height)-var(--spacing))] overflow-auto"
		>
			<RecipeOverview />
		</div>

		<input type="radio" name="profile-overview-tabs" class="tab" aria-label="Conveyors" />
		<div
			class="tab-content bg-base-100 border-base-300 !h-[calc(100%-var(--tab-height)-var(--spacing))] overflow-auto"
		>
			<ConveyorOverview />
		</div>
	</div>
</div>

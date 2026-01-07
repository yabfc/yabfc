<script lang="ts">
	import ItemOverview from '@/lib/components/profile/ItemOverview.svelte';
	import MachineOverview from '@/lib/components/profile/MachineOverview.svelte';
	import RecipeOverview from '@/lib/components/profile/RecipeOverview.svelte';
	import type Profile from '@/lib/models/profile';

	let { profile }: { profile: Profile } = $props();
</script>

<div class="fixed top-24 right-4 bottom-4 flex h-fit max-h-[calc(100%-var(--spacing)*28)] w-80">
	<div class="tabs tabs-box w-full shadow">
		<input type="radio" name="profile-overview-tabs" class="tab" aria-label="Items" checked />

		<!--
			There might be a daisyUI bug for tabs-box which requires us to forcefully override the
			tab-content's height
		-->
		<div
			class="tab-content bg-base-100 border-base-300 !h-[calc(100%-var(--tab-height)-var(--spacing))] overflow-auto"
		>
			<ItemOverview items={profile.items} />
		</div>

		<input type="radio" name="profile-overview-tabs" class="tab" aria-label="Machines" />
		<div
			class="tab-content bg-base-100 border-base-300 !h-[calc(100%-var(--tab-height)-var(--spacing))] overflow-auto"
		>
			<MachineOverview machines={profile.machines} />
		</div>

		<input type="radio" name="profile-overview-tabs" class="tab" aria-label="Recipes" />
		<div
			class="tab-content bg-base-100 border-base-300 !h-[calc(100%-var(--tab-height)-var(--spacing))] overflow-auto"
		>
			<RecipeOverview recipes={profile.recipes}></RecipeOverview>
		</div>
	</div>
</div>

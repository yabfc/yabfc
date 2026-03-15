<script lang="ts">
	import ProfileLayout from '@/components/profile/ProfileLayout.svelte';
	import active from '@/stores/active.svelte';
	import profiles from '@/stores/profiles.svelte';
	import { CableCarIcon } from '@lucide/svelte';

	let { pathParams }: { pathParams: string[] } = $props();

	$effect(() => {
		// update active profile
		active.profile = $profiles.find(x => x.id === pathParams[0]);
	});
</script>

{#if active.profile}
	<ProfileLayout />
{:else}
	<div class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 pt-28">
		<div>
			<CableCarIcon size="150" class="opacity-30" />
		</div>

		<h2 class="text-base-content/70 text-4xl font-bold">Profile not found.</h2>
	</div>
{/if}

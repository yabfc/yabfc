<script lang="ts">
	import ProfileDetails from '@/lib/components/profile/ProfileDetails.svelte';
	import profiles from '@/lib/stores/profiles.svelte';
	import { CableCarIcon } from '@lucide/svelte';

	let { pathParams }: { pathParams: string[] } = $props();

	let activeProfile = $derived(profiles.find(x => x.id === pathParams[0]));
</script>

{#if activeProfile}
	<ProfileDetails profile={activeProfile} />
{:else}
	<div class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 pt-28">
		<div>
			<CableCarIcon size="150" class="opacity-30" />
		</div>

		<h2 class="text-base-content/70 text-4xl font-bold">Profile not found.</h2>
	</div>
{/if}

<script lang="ts">
	import Dialog from '@/components/shared/Dialog.svelte';
	import profiles from '@/stores/profiles.svelte';
	import { FactoryIcon, HeartCrackIcon, RocketIcon } from '@lucide/svelte';

	let dialog = $state<HTMLDialogElement>();

	function openSelectDialog() {
		dialog?.showModal();
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 p-8 pt-28">
	<div>
		<FactoryIcon size="150" class="opacity-30" />
	</div>

	<h2 class="text-base-content/70 text-4xl font-bold">
		There is no Factory here, yet <HeartCrackIcon size="40" class="inline align-top" />
	</h2>

	<button onclick={openSelectDialog} class="btn btn-xl btn-primary m-4">
		Start Building <RocketIcon size="32" />
	</button>
</div>

<Dialog bind:dialog>
	<h3 class="text-lg font-bold">Select the Profile!</h3>

	<div class="flex flex-col gap-2 py-4">
		{#each $profiles as profile (profile.id)}
			<div class="indicator w-full">
				<a href="#/p/{profile.id}" class="btn btn-block btn-xl dark:btn-soft">
					{profile.name}
				</a>
			</div>
		{/each}
	</div>
</Dialog>

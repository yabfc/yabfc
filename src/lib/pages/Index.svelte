<script lang="ts">
	import Dialog from '@/lib/components/shared/Dialog.svelte';
	import profiles from '@/lib/stores/profiles.svelte';
	import type { ProfileInterface } from '@/lib/models/profile';
	import Profile from '@/lib/models/profile';
	import { FactoryIcon, HeartCrackIcon, RocketIcon } from '@lucide/svelte';

	let dialog = $state<HTMLDialogElement>();

	function openSelectDialog() {
		dialog?.showModal();
	}

	function handleProfileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		file.text()
			.then(text => {
				const data = JSON.parse(text);
				let newProfile = new Profile(data as ProfileInterface);
				const idExists = profiles.some(x => x.id === newProfile.id);
				if (idExists) {
					newProfile.id += `-${crypto.randomUUID()}`;
				}
				newProfile.upload = true;
				profiles.push(newProfile);
				window.location.hash = `/p/${newProfile.id}`;
			})
			.catch(err => {
				console.error('Upload failed', err);
			});
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
		{#each profiles as profile}
			<div class="indicator w-full">
				<a href="#/p/{profile.id}" class="btn btn-block btn-xl dark:btn-soft">
					{profile.name}
				</a>
				{#if profile.upload === true}
					<span class="indicator-item status status-success"></span>
				{/if}
			</div>
		{/each}

		<label for="profile-upload" class="btn btn-block btn-xl btn-primary cursor-pointer">
			<span>Import Custom Profile</span>
		</label>
		<input
			id="profile-upload"
			type="file"
			accept=".json"
			class="hidden"
			onchange={handleProfileUpload}
		/>
	</div>
</Dialog>

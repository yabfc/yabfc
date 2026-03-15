<script lang="ts">
	import Profile from '@/lib/models/profile';
	import alerts from '@/stores/alerts.svelte';
	import profiles from '@/stores/profiles.svelte';
	import { FactoryIcon, Trash2Icon } from '@lucide/svelte';
	import { nanoid } from 'nanoid';

	let uploadInput: HTMLInputElement;

	async function upload() {
		const file = uploadInput.files?.[0];
		if (!file) return;

		const text = await file.text().catch(() => alerts.push('Upload of file failed', 'ERROR'));
		if (!text) return;

		const profileInterface = JSON.parse(text);
		let profile = new Profile(profileInterface, false);

		const idExists = $profiles.some(x => x.id === profile.id);
		if (idExists) profile.id += `-${nanoid()}`;

		profiles.update(x => [...x, profile]);
	}

	function removeProfileCreator(id: string) {
		return () => {
			profiles.update(x => x.filter(y => y.id !== id));
		};
	}
</script>

<article class="bg-base-200 card card-lg card-border mx-auto w-3xl max-w-11/12 shadow-md">
	<div class="card-body">
		<div class="card-title justify-between">
			<h2>Profiles</h2>

			<label class="btn btn-soft btn-primary">
				Upload new
				<input
					bind:this={uploadInput}
					type="file"
					accept=".json"
					hidden
					onchange={upload}
				/>
			</label>
		</div>

		<ul class="list">
			{#each $profiles as profile (profile.id)}
				<li class="list-row items-center">
					<div>
						<FactoryIcon />
					</div>

					<div>
						<div>{profile.name}</div>
						<div class="text-xs font-semibold uppercase opacity-60">
							{profile.isDefault ? 'Default' : 'Custom'} Profile
						</div>
					</div>

					{#if !profile.isDefault}
						<div>
							<button
								onclick={removeProfileCreator(profile.id)}
								class="btn btn-sm btn-square btn-error btn-soft"
							>
								<span class="sr-only">Remove Profile</span>
								<Trash2Icon size="18" />
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</article>

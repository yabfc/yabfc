<script lang="ts">
	import profiles from '@/lib/stores/profiles.svelte';
	import { FactoryIcon, ForkliftIcon, SettingsIcon } from '@lucide/svelte';
</script>

<nav
	class="navbar bg-base-200 border-base-300 fixed left-1/2 z-10 my-2 w-11/12 max-w-4xl -translate-x-1/2 rounded-full border-2 px-8 shadow-2xl"
>
	<div class="navbar-start">
		<div class="dropdown">
			<div tabindex="0" role="button" class="btn btn-square btn-ghost">
				<FactoryIcon size="20" />
				<span class="sr-only">Select Profile</span>
			</div>

			<ul class="menu dropdown-content rounded-box bg-base-200 z-10 mt-3 w-52 p-2 shadow-lg">
				{#each profiles as profile}
					<li>
						<details open>
							<summary><FactoryIcon size="20" /> {profile.name}</summary>
							<ul>
								<li>
									<a href="#/p/{profile.id}">
										<ForkliftIcon size="20" /> Sandbox
									</a>
								</li>
							</ul>
						</details>
					</li>
				{:else}
					<li><a href="#/settings">Create your first Profile!</a></li>
				{/each}
			</ul>
		</div>
	</div>

	<a href="#/" class="flex h-10 items-center text-lg font-bold text-nowrap">
		<h1>Yet Another Beautiful Factory Calculator</h1>
	</a>

	<div class="navbar-end inline-flex">
		<a href="#/settings" class="btn btn-ghost btn-square">
			<SettingsIcon size="20" />
			<span class="sr-only">Settings</span>
		</a>
	</div>
</nav>

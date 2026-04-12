<script lang="ts">
	import settings from '@/stores/settings.svelte';
</script>

<article class="bg-base-200 card card-lg card-border mx-auto w-3xl max-w-11/12 shadow-md">
	<div class="card-body">
		<h2 class="card-title">Settings</h2>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Theme</legend>

			<div class="join">
				<input
					id="settingsThemeAuto"
					type="radio"
					bind:group={$settings.theme}
					value=""
					aria-label="System Default"
					class="join-item btn"
				/>
				<input
					id="settingsThemeLight"
					type="radio"
					bind:group={$settings.theme}
					value="light"
					aria-label="Light"
					class="join-item btn"
				/>
				<input
					id="settingsThemeDark"
					type="radio"
					bind:group={$settings.theme}
					value="dark"
					aria-label="Dark"
					class="join-item btn"
				/>
			</div>
		</fieldset>
	</div>
</article>

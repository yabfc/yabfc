<script lang="ts">
	import OverviewWindow from '@/lib/components/profile/OverviewWindow.svelte';
	import ProfileStage from '@/lib/components/profile/ProfileStage.svelte';
	import type Profile from '@/lib/models/profile';

	let { profile }: { profile: Profile } = $props();
</script>

<OverviewWindow {profile} />

<ProfileStage {profile} />

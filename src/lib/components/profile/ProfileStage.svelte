<script lang="ts">
	import StageRecipeChain from '@/lib/components/shared/StageRecipeChain.svelte';
	import type Profile from '@/lib/models/profile';

	let { profile }: { profile: Profile } = $props();
</script>

<div class="h-screen w-screen">
	<StageRecipeChain {profile} />
</div>

import type Profile from '@/lib/models/profile';

// TODO read default profiles
const profiles = $state<Profile[]>([
	{
		id: 'satisfactory',
		name: 'Satisfactory',
		items: [
			{ id: 'iron-ore', name: 'Iron Ore' },
			{ id: 'iron', name: 'Iron' },
		],
	},
	{ id: 'factorio', name: 'Factorio', items: [] },
]);

export default profiles;

import type Profile from '@/lib/models/profile';

// TODO read default profiles
const profiles = $state<Profile[]>([
	{ id: 'satisfactory', name: 'Satisfactory' },
	{ id: 'factorio', name: 'Factorio' },
]);

export default profiles;

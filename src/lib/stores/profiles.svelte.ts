import type Profile from '@/lib/models/profile';
import satisfactory from 'profiles/satisfactory.json';
import factorio from 'profiles/factorio.json';
import factorioSpaceage from 'profiles/factorio-spaceage.json';

const profiles = $state<Profile[]>([
	satisfactory as Profile,
	factorio as Profile,
	factorioSpaceage as Profile,
]);

export default profiles;

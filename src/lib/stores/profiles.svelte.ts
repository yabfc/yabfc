import type Profile from '@/lib/models/profile';
import factorioSpaceage from '@profiles/factorio-spaceage.json';
import factorio from '@profiles/factorio.json';
import satisfactory from '@profiles/satisfactory.json';

const profiles = $state<Profile[]>([
	satisfactory as Profile,
	factorio as Profile,
	factorioSpaceage as Profile,
]);

export default profiles;

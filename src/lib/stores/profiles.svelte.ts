import type { ProfileInterface } from '@/lib/models/profile';
import Profile from '@/lib/models/profile';
import factorioSpaceage from '@profiles/factorio-spaceage.json';
import factorio from '@profiles/factorio.json';
import satisfactory from '@profiles/satisfactory.json';

const profiles = $state<Profile[]>([
	new Profile(satisfactory as ProfileInterface),
	new Profile(factorio as ProfileInterface),
	new Profile(factorioSpaceage as ProfileInterface),
]);

export default profiles;

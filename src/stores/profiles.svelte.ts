import type { ProfileInterface } from '@/lib/models/profile';
import Profile from '@/lib/models/profile';
import factorioSpaceage from '@profiles/factorio-spaceage.json';
import factorio from '@profiles/factorio.json';
import satisfactory from '@profiles/satisfactory.json';
import factorioQuality from '@profiles/factorio-quality.json';
import { writable } from 'svelte/store';

const PROFILES_LOCAL_STORAGE_KEY = 'profiles';

const defaultProfiles = [
	new Profile(satisfactory as ProfileInterface),
	new Profile(factorio as ProfileInterface),
	new Profile(factorioSpaceage as ProfileInterface),
	new Profile(factorioQuality as ProfileInterface),
];

const profiles = writable([...defaultProfiles]);

// set initial saved state
setProfilesFromLocalStorage();

// update localStorage on every settings update
profiles.subscribe(x => {
	if (!localStorage) return;

	const profilesToStore = x.filter(y => !y.isDefault);

	localStorage.setItem(PROFILES_LOCAL_STORAGE_KEY, JSON.stringify(profilesToStore || []));
});

export default profiles;

function setProfilesFromLocalStorage() {
	if (!localStorage) return;

	const profilesString = localStorage.getItem(PROFILES_LOCAL_STORAGE_KEY);

	if (!profilesString) return;

	const customProfiles = JSON.parse(profilesString);

	profiles.set([...defaultProfiles, ...customProfiles]);
}

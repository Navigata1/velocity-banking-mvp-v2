import { prepareMedicalPoster } from './prepare-medical-poster.mjs';
import { publishHeroPosters } from './hero-poster-publication.mjs';
const prepared=await prepareMedicalPoster();
await publishHeroPosters([prepared]);
console.log(`Medical poster revision${prepared.record.revision}: ${prepared.output.length} bytes, SHA256 ${prepared.record.posterSha256}`);

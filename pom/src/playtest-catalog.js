import {decodePuzzle,puzzleLevel} from '../shared/puzzle.js';

// This build has no dependency on the built-in level catalog.
export default {levels:[{...puzzleLevel(decodePuzzle(new URLSearchParams(location.hash.slice(1)).get('playtest'))),temporaryPlaytest:true}],groups:[]};

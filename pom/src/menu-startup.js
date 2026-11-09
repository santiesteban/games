import catalog from '#level-catalog';
import {createLevelProgress} from './level-progress.js';
import {createLevelPreferences} from './level-preferences.js';
import {CONTROL_FEATURES,createControlFeatures} from './control-features.js';
import {createCatalogScreens} from './catalog-screens.js';
import {createUnfinishedPuzzles} from './unfinished-puzzles.js';
import {createMyPuzzles} from './my-puzzles.js';
import {movementExamples,studioLevel} from './movement-studio.js';
import {deploymentUrls} from '../shared/deployment.js';
import {setLoadingPalette} from './loading-palette.js';

// The menu keeps its state when the game module is loaded for the first level.
export let menuStartup;
export function startMenu(){
  const {levels,groups}=catalog, abort=new AbortController(), options={signal:abort.signal};
  const isPreview=level=>['design-playground','background-studio'].includes(level.kind);
  const progress=createLevelProgress(levels.filter(level=>!isPreview(level)));
  const preferences=createLevelPreferences(), features=createControlFeatures();
  const menu=document.querySelector('#menuScreen');
  const unfinished=createUnfinishedPuzzles();
  const runtime=menuStartup={progress,preferences,features,unfinished,catalog:null,puzzles:null,open:null,play:null,change:null};
  function show(panel){
    document.documentElement.dataset.screen=panel==='title'?'home':panel;
    menu.hidden=false;menu.classList.toggle('is-levels',panel==='levels');menu.classList.toggle('is-settings',panel==='settings');
    for(const name of ['title','levels','settings'])document.querySelector(`#${name}Panel`).hidden=panel!==name;
    document.querySelector('.stage').inert=true;
    if(panel==='levels')runtime.catalog.render();
    if(panel==='title')runtime.catalog.renderHome();
    if(panel==='settings'){
      document.querySelector('#clearProgressConfirm').hidden=true;
      document.querySelector('#clearProgress').hidden=false;
      document.querySelector('#progressMessage').textContent='';
      updateProgress();
    }
    menu.scrollTop=0;
    document.querySelector(panel==='title'?'#titlePanel .brand':panel==='levels'?'#backTitle':'#settingsHome').focus({preventScroll:true});
  }
  function updateProgress(){
    document.querySelector('#progressCount').textContent=`${progress.count} of ${levels.filter(level=>!isPreview(level)).length} levels completed`;
    document.querySelector('#clearProgress').disabled=progress.count===0;
  }
  function syncFeatures(){
    for(const feature of CONTROL_FEATURES){const input=document.querySelector(`#${feature.id}`);if(input)input.checked=features.enabled(feature.id)}
    document.querySelector('#pieceHighlight').value=features.enabled('selectionLightbox')?'lightbox':'original';
    document.querySelector('#topFaceAppearance').value=features.topFaceStyle;
    document.querySelector('#movementMarkerShape').value=features.movementMarkerShape;
  }
  function preferenceMessage(id,saved){document.querySelector(id).textContent=saved?'':'This setting applies now, but could not be saved in this browser.'}
  runtime.open=()=>show('levels');
  runtime.change=()=>{if(!document.querySelector('#levelsPanel').hidden)runtime.catalog.render();else runtime.catalog.renderHome()};
  runtime.play=async level=>{
    abort.abort();
    menu.hidden=true;document.querySelector('.stage').inert=false;
    setLoadingPalette(document.querySelector('#levelLoading'),level);
    document.querySelector('#levelLoading').hidden=false;
    document.querySelector('#levelLoadingMessage').textContent='Loading puzzle…';
    void import('./loading-star.js').then(({initLoadingStar})=>initLoadingStar()).catch(()=>{});
    try{const game=await import('./main.js');await game.openMenuLevel(level)}
    catch(error){console.error('Unable to load game',error);document.querySelector('#levelLoadingMessage').textContent='The game could not start. Please reload and try again.'}
  };
  const puzzles=runtime.puzzles=createMyPuzzles({play:level=>runtime.play(level),onChange:()=>runtime.change(),creatorUrl:deploymentUrls().creator});
  runtime.catalog=createCatalogScreens({levels,groups,progress,unfinished,isAvailable:level=>level.compatibility.playable&&(!preferences.hideKnownIssues||!level.knownIssues),myPuzzles:puzzles,thumbnailLevel:level=>level.kind==='movement-studio'?studioLevel(levels,movementExamples[0]):level,open:()=>runtime.open(),play:level=>runtime.play(level)});
  runtime.catalog.ready();puzzles.openPending();
  document.querySelector('#buildNumber').textContent=`Build ${__BUILD_INFO__.number} · ${__BUILD_INFO__.revision}${__BUILD_INFO__.development?' (development)':''}`;
  for(const [selector,panel] of [['#openSettings','settings'],['#settingsHome','title'],['#backTitle','title'],['[data-home]','title']])document.querySelector(selector).addEventListener('click',event=>{event.preventDefault();show(panel)},options);
  for(const feature of CONTROL_FEATURES){const toggle=document.querySelector(`#${feature.id}`);if(!toggle)continue;toggle.addEventListener('change',()=>{const saved=features.set(feature.id,toggle.checked);if(toggle.checked&&['stackedPieceButtons','pieceDragArrows'].includes(feature.id))features.set(feature.id==='stackedPieceButtons'?'pieceDragArrows':'stackedPieceButtons',false);syncFeatures();preferenceMessage('#controlFeatureMessage',saved)},options)}
  document.querySelector('#pieceHighlight').addEventListener('change',event=>preferenceMessage('#pieceHighlightMessage',features.set('selectionLightbox',event.target.value==='lightbox')),options);
  document.querySelector('#topFaceAppearance').addEventListener('change',event=>{preferenceMessage('#controlFeatureMessage',features.setTopFaceStyle(event.target.value));syncFeatures()},options);
  document.querySelector('#movementMarkerShape').addEventListener('change',event=>{preferenceMessage('#controlFeatureMessage',features.setMovementMarkerShape(event.target.value));syncFeatures()},options);
  for(const name of ['hideKnownIssues','hideHelpText']){const toggle=document.querySelector(`#${name}`);toggle.checked=preferences[name];toggle.addEventListener('change',()=>{preferenceMessage('#preferenceMessage',preferences.set(name,toggle.checked));runtime.change()},options)}
  document.querySelector('#clearProgress').addEventListener('click',()=>{document.querySelector('#clearProgress').hidden=true;document.querySelector('#clearProgressConfirm').hidden=false;document.querySelector('#cancelClearProgress').focus()},options);
  document.querySelector('#cancelClearProgress').addEventListener('click',()=>{document.querySelector('#clearProgressConfirm').hidden=true;document.querySelector('#clearProgress').hidden=false;document.querySelector('#clearProgress').focus()},options);
  document.querySelector('#confirmClearProgress').addEventListener('click',()=>{if(!progress.clear()){document.querySelector('#progressMessage').textContent='Your browser could not clear progress. Check that site storage is allowed.';return}runtime.change();updateProgress();document.querySelector('#clearProgressConfirm').hidden=true;document.querySelector('#clearProgress').hidden=false;document.querySelector('#progressMessage').textContent='Your progress has been cleared.'},options);
  window.addEventListener('storage',event=>{if(event.key===unfinished.key)runtime.change();if(event.key===progress.key||event.key===null){progress.reload();runtime.change();updateProgress()}if(event.key===preferences.key||event.key===null){preferences.reload();for(const name of ['hideKnownIssues','hideHelpText'])document.querySelector(`#${name}`).checked=preferences[name];runtime.change()}if(event.key===features.key||event.key===null){features.reload();syncFeatures()}},options);
  syncFeatures();updateProgress();
  document.querySelector('#interactionLabLink').hidden=false;
  return runtime;
}

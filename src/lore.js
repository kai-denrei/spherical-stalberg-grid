// lore.js — the codex. Every unit described twice: once as it EXISTS in
// the fiction (survey-log register, sci-fi realistic), once as a dense
// visual prompt fit for a txt2img model. The game's dot-render is, in
// fiction, an approximation: the tank's survey lattice can only display
// what its lidar returns, so the player sees constellations standing in
// for things that are wetter, brighter, and worse.
//
// Pure data + tiny formatters. Node-tested: every catalogue id must have
// an entry (assert the rule — the roster grows, the codex must grow with
// it or the test says so).

export const LORE_WORLD = [
  {
    id: 'world',
    name: 'OBJECT STÅLBERG-9',
    tag: 'the vessel',
    body: 'An artificial spheroid eleven kilometres across, found dark and '
      + 'cold on a slow polar orbit of a dead gas giant. Its surface is a '
      + 'single engineered shell: an organic quadrilateral lattice, no two '
      + 'cells alike, ridge-walls of fused regolith rising between sunken '
      + 'lanes like the veins of a leaf. Nothing about S-9 is natural and '
      + 'nothing about it is finished — the lanes route power nobody is '
      + 'drawing, toward a heart nobody installed. Survey doctrine: one '
      + 'tank, landed light, weapons free.',
    visual: 'a vast artificial asteroid, engineered spherical megastructure, '
      + 'organic quadrilateral grid shell of fused grey regolith, glowing '
      + 'cyan seams between irregular quad tiles, low ridge walls casting '
      + 'long shadows, deep space background with a dim banded gas giant, '
      + 'hard rim light, ultra-detailed sci-fi realism, orbital wide shot, '
      + 'anamorphic lens flare, 8k',
  },
  {
    id: 'lattice',
    name: 'THE SURVEY LATTICE',
    tag: 'why everything is dots',
    body: 'The tank does not see. It samples. Phased lidar sweeps return '
      + 'point-clouds at forty hertz, and the archive you are reading '
      + 'renders those constellations as-is, because reconstruction is '
      + 'expensive and honesty is not. Every organism in this codex is '
      + 'therefore an approximation: the real ones have surfaces, membranes, '
      + 'wet light. When a return shows a SOLID inside the points — a core '
      + 'the beam cannot pass — do not ram it. That rule is written in hull '
      + 'fragments.',
    visual: 'holographic lidar point-cloud visualization of alien creatures, '
      + 'constellations of glowing dots forming translucent bodies, dark '
      + 'console interface, phosphor green and cyan points on black, faint '
      + 'scanlines, volumetric projection above a military terminal, '
      + 'photoreal CGI render, shallow depth of field',
  },
  {
    id: 'heart',
    name: 'THE CARDION',
    tag: 'the pulsating heart · north pole',
    body: 'At the north pole, a heart. Not a metaphor: a four-chambered '
      + 'anatomical heart three storeys tall, projected in coherent light '
      + 'above a socket the vessel grew for it, beating sixty to the minute '
      + 'and faster when threatened. It is a hologram that casts shadows. '
      + 'Instruments disagree about whether it is a reactor readout, a '
      + 'terraforming seed, or the vessel dreaming of the crew it never '
      + 'had. The organisms want it stopped. That is all the tactical '
      + 'picture requires.',
    visual: 'colossal holographic human heart hovering above an alien '
      + 'mechanical socket, translucent magenta-red volumetric projection, '
      + 'anatomically detailed, gentle pulse mid-beat, light spilling over '
      + 'grey engineered stone, particles drifting upward, dark sci-fi '
      + 'cathedral atmosphere, cinematic lighting, hyperrealistic, 8k',
  },
  {
    id: 'portal',
    name: 'THE GATES',
    tag: 'enemy ingress',
    body: 'They arrive by ring. A gate begins as a pencil-line of light that '
      + 'draws itself in a circle, locks nine chevron masses around its rim, '
      + 'then fills with a disc of standing liquid that is not liquid — the '
      + 'event horizon, surface-tension over elsewhere. Gates dim as they '
      + 'are wounded and die like lamps. Three shells close one. What dials '
      + 'them from the far side has never shown itself, and the Relay, '
      + 'when asked, answers only with handshake tones.',
    visual: 'alien stargate ring standing on an asteroid plain, glowing '
      + 'white-blue toroidal frame with nine locked chevrons, rippling '
      + 'liquid-light event horizon, concentric shimmering rings inside, '
      + 'cold mist at the base, star field behind, sci-fi realism, long '
      + 'exposure glow, dramatic low angle, 8k render',
  },
  {
    id: 'server',
    name: 'THE ANTIPODE RELAY',
    tag: 'the mysterious server · south pole',
    body: 'At the exact antipode of the Cardion, sunk in a carved vault the '
      + 'shell grew around it, stands a server rack that predates every '
      + 'protocol we brought. It is invincible in the practical sense: '
      + 'ordnance marks the dust, never the chassis. Approach and it wakes, '
      + 'negotiating in fifty-six-kilobaud handshake song, offering a '
      + 'terminal and a wager. Win its games and it decrypts tower '
      + 'schematics it has no business holding. The Relay and the Heart '
      + 'have never been observed to communicate. Nobody believes that.',
    visual: 'ancient alien server rack in a carved stone vault, matte black '
      + 'monolithic chassis with amber status LEDs, dust motes in a single '
      + 'shaft of light, cables fused into rock, green CRT terminal glow, '
      + 'brutalist sci-fi archaeology, moody chiaroscuro, photorealistic, '
      + 'medium format look',
  },
];

export const LORE = {
  // --- friendly ----------------------------------------------------------
  tank: {
    name: 'SURVEY TANK, PATTERN A',
    tag: 'the procedural hull',
    body: 'The expedition’s baseline machine: a squat gravsled hull on '
      + 'six lift emitters, one deliberate main gun fed from a nine-shell '
      + 'rack bolted where a crew would sit, twin toed-in mini-lasers at '
      + 'the bow. It is not brave and not fast; it is REPAIRABLE, which on '
      + 'S-9 is the entire virtue. Doctrine paints its running lights by '
      + 'hull integrity, so a dying tank glows like an ember and everyone '
      + 'on the net knows it.',
    visual: 'compact futuristic hover tank on an asteroid surface, boxy '
      + 'utilitarian hull, six glowing lift emitters underneath, single '
      + 'heavy cannon, two small laser barrels at the front, visible '
      + 'nine-shell ammunition rack, neon edge lighting, worn metal, '
      + 'grounded military sci-fi realism, dust kicked by thrusters, '
      + 'golden hour rim light, 8k',
  },
  mkcx: {
    name: 'MK-CX "DENREI"',
    tag: 'the authored hover tank',
    body: 'Someone loved this machine before we found its plans. An '
      + 'articulated turret that never stops hunting, secondary gun pods '
      + 'that track independently, a skirt of nacelles that kneel and rise '
      + 'on hydraulic song. Its glow-strips are a single circuit — deck, '
      + 'hull, gun rings, headlights — wired to report damage as colour, '
      + 'ember-red at the end. Crews talk to it. Crews are not wrong to.',
    visual: 'sleek articulated hover tank, low wide chassis with hydraulic '
      + 'nacelle skirt, rotating turret with long cannon, twin secondary '
      + 'gun pods, continuous neon glow strips tracing the hull, cyan '
      + 'accents on gunmetal, floating over engineered stone tiles, '
      + 'mecha-realism concept art, dramatic three-quarter view, '
      + 'cinematic HDR, 8k',
  },

  // --- towers -------------------------------------------------------------
  single: {
    name: 'ARM, SIX-AXIS',
    tag: 'single-shot emplacement',
    body: 'A factory manipulator that learned violence. Pedestal, shoulder, '
      + 'elbow, wrist, tool-flange — and where a welder should sit, a '
      + 'single-shot accelerator that punches one round at a time with a '
      + 'machinist’s patience. It aims the way it used to reach for '
      + 'parts: exactly, without hurry, forever.',
    visual: 'industrial six-axis robotic arm mounted on a stone wall '
      + 'pedestal, converted into a gun emplacement, tool flange replaced '
      + 'by a compact railgun, hydraulic joints, warning stripes worn to '
      + 'grey, single muzzle flash, night operations lighting, hard '
      + 'sci-fi realism, 8k',
  },
  rapid: {
    name: 'DELTA FRAME',
    tag: 'rapid-fire emplacement',
    body: 'Three parallel arms falling from a fixed triangle, built to pick '
      + 'and place four times a second. The conversion kept the cadence and '
      + 'swapped the suction cup for a repeater. Watching it fire is '
      + 'watching a pastry chef work: blurred, rhythmic, indifferent to '
      + 'what it is actually doing.',
    visual: 'delta robot with three carbon parallel arms on a triangular '
      + 'frame, mounted on a defensive pedestal, rapid-fire kinetic '
      + 'repeater at the effector, muzzle flashes in burst, motion blur on '
      + 'the arms, cold industrial lighting, high-speed photography look, '
      + 'sci-fi realistic, 8k',
  },
  spread: {
    name: 'RIPPLE ANTENNA',
    tag: 'spread emplacement',
    body: 'Concentric rings frozen mid-splash, as if a stone had been '
      + 'thrown into standing metal. It fires the way it looks: a fan of '
      + 'pellets on the ring-normals, wasteful and wide, the shotgun '
      + 'argument made in radio-telescope grammar.',
    visual: 'sculptural antenna of concentric metal rings like a frozen '
      + 'water ripple, mounted on a wall pedestal, firing a fan of glowing '
      + 'pellets, standing on asteroid high ground, backlit by muzzle '
      + 'glow, elegant brutalism, sci-fi product render, 8k',
  },
  slow: {
    name: 'BROADCAST MAST',
    tag: 'suppression field',
    body: 'A tapered mast under a stack of radiators, transmitting nothing '
      + 'a receiver would call signal. What it broadcasts is reluctance: a '
      + 'field that thickens time around every organism in range, tethering '
      + 'them in threads of pale lightning while the guns do arithmetic.',
    visual: 'tall broadcast antenna tower with stacked radiator elements, '
      + 'emitting a visible field distortion, pale electric tethers '
      + 'arcing to translucent alien creatures below, slow-motion '
      + 'atmosphere, blue-white energy, defensive installation on stone '
      + 'ridge, sci-fi realism, volumetric light, 8k',
  },
  homing: {
    name: 'GRIPPER ARM',
    tag: 'seeker battery',
    body: 'A long-reach manipulator ending in a two-finger claw, repurposed '
      + 'as a launch rail. The claw does not grip cargo any more; it grips '
      + 'the seeker until the lock is clean, then opens. Its missiles '
      + 'chase the way debts chase: patiently, around corners, to the end.',
    visual: 'robotic gripper arm with two-finger claw holding a small '
      + 'glowing missile, mounted turret base, missile launching with a '
      + 'curved light trail chasing a translucent alien, smoke ring at '
      + 'release, kinetic action shot, military sci-fi realism, 8k',
  },
  aoe: {
    name: 'MORTAR, TUBE-AND-BASEPLATE',
    tag: 'area denial',
    body: 'The oldest silhouette in the codex: a tube on a plate, aimed by '
      + 'faith and mathematics. Its shells go up sentimental and come down '
      + 'statistical, marking the landing cell a heartbeat early — threat '
      + 'you can read, and step out of, which the organisms never learn.',
    visual: 'compact sci-fi mortar, thick launch tube on a baseplate '
      + 'mounted on stone battlements, lobbing a glowing spherical shell '
      + 'in a high arc, target ring projected on the ground below, night '
      + 'battle, tracer arc long exposure, realistic military hardware, 8k',
  },
  sniper: {
    name: 'GUYED MAST',
    tag: 'railgun overwatch',
    body: 'A needle of a tower held vertical by tensioned stays, with one '
      + 'long accelerator laid along its spine. It does not shoot through '
      + 'walls and resents that it cannot. One round, one lane, one '
      + 'organism subtracted — the slug crosses the whole sightline before '
      + 'the sound does.',
    visual: 'extremely tall thin guyed mast tower with tension cables, '
      + 'integrated vertical railgun, single luminous slug streaking flat '
      + 'across the frame with ghost trail, watchtower on asteroid ridge '
      + 'at dusk, minimalist composition, hard sci-fi, 8k',
  },
  laser: {
    name: 'THE OBELISK',
    tag: 'beam emplacement',
    body: 'Tapered stone shoulders, pyramidion cap, and no visible weapon '
      + 'at all until the cap splits its light down a lane. We built the '
      + 'others; the Obelisk we mostly excavated, added a trigger, and '
      + 'chose not to ask. It hums in the same key as the Relay’s '
      + 'handshake. Nobody has put those two facts in one report before '
      + 'this one.',
    visual: 'black monolithic obelisk with a glowing pyramidion apex, '
      + 'firing a continuous vertical-split energy beam across a dark '
      + 'plain, hieroglyph-like etched seams glowing faintly, ancient '
      + 'alien technology fused with military mount, ominous sci-fi '
      + 'realism, dramatic silhouette, 8k',
  },

  // --- pickups ------------------------------------------------------------
  'pickup-power': {
    name: 'OVERDRIVE SPHERE',
    tag: 'field reward · permanent',
    body: 'A spiked star of crystallized charge left where the shell’s '
      + 'power routing pools. Drive through one and the emitters run eight '
      + 'percent hot forever. The vessel appears to be paying the survey '
      + 'for reaching far ground. Nobody has invoiced it back.',
    visual: 'spiked crystalline energy star hovering above stone tiles, '
      + 'pale cyan light, electric filaments, faint rotation blur, '
      + 'collectible artifact presentation, dark background, macro focus, '
      + 'photoreal render, 8k',
  },
  'pickup-health': {
    name: 'REPAIR CELL',
    tag: 'field reward · hull',
    body: 'A faceted green cell that dissolves against a damaged hull and '
      + 'reads, on the manifest, as one life that was not lost after all. '
      + 'Green means health in every language the expedition brought, and '
      + 'apparently in the vessel’s as well.',
    visual: 'glowing green icosahedral capsule floating low over asteroid '
      + 'ground, soft pulsing emerald light, repair nanite mist around '
      + 'it, dark terrain, single collectible in frame, product-shot '
      + 'clarity, photoreal, 8k',
  },
  'pickup-regen': {
    name: 'REGEN CHARGE',
    tag: 'field reward · carried',
    body: 'A magenta torus that will not spend itself where you find it. '
      + 'It rides the hull, humming louder as the pole nears, and gives '
      + 'itself to the Cardion in one bright transfusion — four beats '
      + 'restored. The only cargo on S-9, and the only errand.',
    visual: 'magenta glowing torus ring hovering above a hover tank’s '
      + 'rear deck, energy tether trailing toward a distant holographic '
      + 'heart on the horizon, night drive, neon reflections on hull, '
      + 'cinematic escort-mission atmosphere, photoreal sci-fi, 8k',
  },
  'pickup-shield': {
    name: 'AEGIS DOME',
    tag: 'field reward · timed',
    body: 'A half-dome of standing charge that unfolds into a full bubble '
      + 'over the hull: twelve seconds during which the dangerous tier '
      + 'may touch, and shove, and mark the paint, and take nothing. The '
      + 'bubble spends itself blinking, so the crew counts out loud.',
    visual: 'translucent cyan energy dome pickup on the ground, then a '
      + 'full spherical particle shield enveloping a hover tank, '
      + 'hexagonal shimmer where a claw strikes it, impact ripple, '
      + 'dramatic defensive moment, realistic VFX render, 8k',
  },
  'pickup-shells': {
    name: 'MISSILE TRIAD',
    tag: 'ammunition drop',
    body: 'Three shells standing in the open like planted seeds, cone-up, '
      + 'driving bands bright. The rack holds nine and the vessel seems '
      + 'to know it: triads respawn on a clock nobody set, always in '
      + 'threes, always where the fighting is about to be.',
    visual: 'three sleek artillery shells standing upright in a triangle '
      + 'formation on stone tiles, brass driving bands catching light, '
      + 'faint hologram marker above them, ammunition cache in a war '
      + 'zone, realistic military still life, shallow depth of field, 8k',
  },

  container: {
    name: 'LIFE CONTAINER',
    tag: 'the spare hulls · by the heart',
    body: 'Three intermodal containers stand in the Cardion’s light, doors '
      + 'jacked open, lock lamps burning green. Two hold spare MK-CX hulls, '
      + 'engines cold, painted and fueled; the third stands empty, which is '
      + 'the honest way to display a number that starts at two. Lose a hull '
      + 'in the field and a container’s lamps go red over a bare deck. The '
      + 'crews do not decorate them. The count decorates itself.',
    visual: 'three weathered sci-fi shipping containers near a glowing '
      + 'holographic heart, doors open, interior spotlights, two containing '
      + 'parked futuristic hover tanks, one empty with red lock lamps, '
      + 'green status lamps on the stocked pair, dramatic pole-station '
      + 'lighting, photoreal military logistics, 8k',
  },

  // --- hostiles -----------------------------------------------------------
  phage: {
    name: 'THE PHAGE',
    tag: 'wave 1 · swarm scavenger',
    body: 'The smallest thing that hates you here. A thumb-sized tuft of '
      + 'gel and cilia, harmless alone, arriving in dozens with the '
      + 'patience of weather. Their bodies light up violet when they '
      + 'commit to a direction, which is constantly and badly. They go '
      + 'under the treads like wet snow.',
    visual: 'swarm of small translucent bioluminescent alien organisms, '
      + 'violet gel bodies with fine cilia, glowing internal filaments, '
      + 'drifting low over engineered stone, macro bioluminescence '
      + 'photography style, dark background, wet refraction, 8k',
  },
  ghost: {
    name: 'WAVE GHOST',
    tag: 'wave 2 · agile flyer',
    body: 'A veil of tissue one cell thick, flying by peristalsis, visible '
      + 'mostly as the light it bends. It banks like a plastic bag in '
      + 'wind and arrives like a decision. Soft-bodied: the hull wins '
      + 'every argument with it.',
    visual: 'translucent flying alien veil creature, single sheet of '
      + 'rippling tissue, pale blue-white bioluminescent edge glow, '
      + 'refraction and caustics, undulating mid-flight over dark '
      + 'terrain, deep sea creature aesthetic in space, photoreal, 8k',
  },
  scoutufo: {
    name: 'SCOUT BACILLUS',
    tag: 'wave 3 · fast scout',
    body: 'A rod-form the length of a forearm, flagella trailing like a '
      + 'ship’s wake, beating through vacuum it should not be able to '
      + 'swim. It runs ahead of every wave, tastes the defences, and dies '
      + 'reporting. The waves after it arrive better.',
    visual: 'rod-shaped bacterial alien the size of a forearm, translucent '
      + 'capsule body with glowing organelles, long trailing flagella in '
      + 'motion blur, cyan bioluminescence, swimming above asteroid '
      + 'tiles, electron-microscope aesthetic rendered photoreal, 8k',
  },
  amoeba: {
    name: 'THE AMOEBA',
    tag: 'wave 4 · crawler',
    body: 'A hundred kilos of clear cytoplasm crossing the lattice at '
      + 'walking pace, organelles drifting inside like furniture in a '
      + 'flood. It does not dodge. It does not need to; there is always '
      + 'another one. Ram it and it parts around the bow with a sound '
      + 'crews turn their radios down not to hear.',
    visual: 'large translucent amoeba organism crawling over stone grid, '
      + 'clear gel body with visible drifting organelles, soft internal '
      + 'green-white glow, pseudopods gripping tile edges, wet '
      + 'subsurface scattering, biological horror realism, 8k',
  },
  jellyfish: {
    name: 'THE JELLYFISH',
    tag: 'wave 5 · pulse drifter',
    body: 'A bell of glass tissue that swims the way bells ring: '
      + 'contraction, glide, silence. Its trailing filaments taste for '
      + 'the Cardion’s field and pull the whole animal poleward. '
      + 'Beautiful in the archive footage. The archive footage does not '
      + 'have to hold the line.',
    visual: 'ethereal alien jellyfish swimming through thin vacuum haze, '
      + 'transparent bell with magenta bioluminescent ribs, long glowing '
      + 'tentacle filaments, pulsing mid-contraction, dark starfield '
      + 'behind, deep-sea documentary lighting in space, photoreal, 8k',
  },
  gslime: {
    name: 'GREEN SLIME',
    tag: 'wave 6 · regenerator',
    body: 'A colony pretending to be an animal. Wound it and the wound '
      + 'argues, closes, forgets — leave it unhit for a breath and it is '
      + 'whole. The doctrine is impolite but correct: run it over before '
      + 'it finishes its sentence.',
    visual: 'viscous green translucent slime colony creature, glowing '
      + 'chartreuse core masses, surface constantly resealing over '
      + 'wounds, dripping gel strands, toxic glow on wet stone, '
      + 'bio-horror realism, macro detail, 8k',
  },
  drifter: {
    name: 'WAVE SATURN',
    tag: 'wave 7 · first of the solid tier',
    body: 'The first return with a core the beam cannot pass: a gel '
      + 'planet wearing a mineral ring, drifting erratic as pollen. The '
      + 'ring is not decoration — it is skeleton worn outside, and the '
      + 'octahedral heart inside it does not part for hulls. The lattice '
      + 'draws such cores SOLID. Believe the lattice.',
    visual: 'spherical translucent alien organism with a solid mineral '
      + 'ring orbiting its equator, dense crystalline octahedral core '
      + 'visible inside gel body, pale gold bioluminescence, drifting '
      + 'erratically, planet-like microorganism, photoreal scientific '
      + 'illustration style, 8k',
  },
  corona: {
    name: 'VIRUS',
    tag: 'wave 8 · armored',
    body: 'A sphere studded with protein spikes around a toroidal mineral '
      + 'core, twice as hard to kill as anything before it and aware of '
      + 'it. Gunfire makes it flinch slow, which is the only manners it '
      + 'has. It does not want the Heart the way the others want it; it '
      + 'wants it the way infection wants a cell.',
    visual: 'giant virus-like alien sphere with translucent membrane and '
      + 'protein spike studs, solid glowing torus core inside, sickly '
      + 'red-orange bioluminescence, drifting toward a distant '
      + 'holographic heart, ominous pathogen aesthetic, hyperreal '
      + 'microbiology render at macro scale, 8k',
  },
  barbed: {
    name: 'BARBED MINE',
    tag: 'wave 9 · pain-driven',
    body: 'A gel sphere grown around an icosahedral core, every vertex '
      + 'extruded into a hardened barb. It is the only organism on S-9 '
      + 'that gunfire improves: hit it and it accelerates, pain as '
      + 'throttle. The correct order is one round, then all the rounds.',
    visual: 'spiked spherical alien mine creature, translucent amber gel '
      + 'over a solid icosahedral core, long hardened barbs at every '
      + 'vertex, surging forward with angry red bioluminescent flare, '
      + 'aggressive motion, dark battlefield, photoreal creature '
      + 'design, 8k',
  },
  rolling: {
    name: 'ROLLING MINE',
    tag: 'wave 10 · heavy',
    body: 'Four hundred kilos of the barbed pattern scaled past argument, '
      + 'travelling by rolling its whole body over its own spikes. The '
      + 'ground remembers where it has been. Shells slow it; nothing '
      + 'polite stops it.',
    visual: 'massive rolling spiked alien sphere crushing stone tiles, '
      + 'heavy translucent body over dense mineral core, spikes striking '
      + 'sparks from the lattice, slow unstoppable momentum, debris and '
      + 'dust, low tracking shot, kaiju-scale realism, 8k',
  },
  prime: {
    name: 'PRIME MINE',
    tag: 'wave 11 · apex regenerator',
    body: 'The heavy pattern with the colony’s memory: an armored '
      + 'sphere that knits itself mid-advance, wounds closing in the '
      + 'order they were given. The survey classifies it apex-tier and '
      + 'the survey is flattering itself — nothing here hunts it. It '
      + 'simply proceeds.',
    visual: 'huge armored alien sphere with regenerating translucent '
      + 'flesh over a mineral endoskeleton, glowing seams sealing '
      + 'themselves, spikes reforming, majestic and terrible advance, '
      + 'battlefield scarred around it, epic scale, cinematic '
      + 'realism, 8k',
  },
  knot: {
    name: 'THORUS',
    tag: 'wave 12 · the boss',
    body: 'A torus tied through itself, rotating through angles the eye '
      + 'files complaints about. The lattice labels the return SOLVING, '
      + 'present tense, because the knot is loosening one crossing per '
      + 'orbit and no instrument agrees what happens when it finishes. '
      + 'It takes three beats from the Cardion per touch, accelerates '
      + 'when hurt, and sings — one clean tone, rising.',
    visual: 'impossible knotted torus alien entity, self-intersecting '
      + 'translucent topology glowing crimson from within, rotating in '
      + 'non-euclidean motion, mathematical horror, red light spilling '
      + 'across asteroid tiles, cosmic dread atmosphere, hyperreal '
      + 'render, 8k',
  },
  saucer: {
    name: 'SAUCER',
    tag: 'wave 13 · dogfighter',
    body: 'An oblate disc of cartilage and lift bladders with a crown of '
      + 'sensor domes, flying like a rumor — surging, stalling, sideslipping '
      + 'through gunfire that was aimed at where it ought to be. Soft '
      + 'under the treads, if the treads can catch it.',
    visual: 'small organic alien saucer creature in fast erratic flight, '
      + 'oblate translucent disc body with glowing dome crown, pale ice- '
      + 'blue bioluminescence, motion trails from evasive jinking, '
      + 'tracer fire missing it, aerial combat energy, photoreal, 8k',
  },
  shellback: {
    name: 'SHELLBACK',
    tag: 'wave 14 · the tactician',
    body: 'A logarithmic spiral of pearl and muscle, the only organism '
      + 'that has demonstrably read our doctrine. It stalls at the edge '
      + 'of tower coverage — precisely the edge, measured, insulting — '
      + 'and waits for lesser waves to arrive as armor. Then it rides '
      + 'them through the fire lane at a sprint. The survey wants one '
      + 'alive. The survey can come get it personally.',
    visual: 'nautilus-like alien with a luminous pearl spiral shell, '
      + 'translucent amber flesh breathing at the aperture, waiting '
      + 'motionless at the edge of searchlight cones while smaller '
      + 'creatures stream past, intelligent menace, deep shadow '
      + 'composition, photoreal, 8k',
  },
  phantom: {
    name: 'PHANTOM',
    tag: 'wave 15 · optical camouflage',
    body: 'The veil pattern, grown a mirror. Its tissue bends light '
      + 'around a faceted core, and what remains is a smear of maybe — '
      + 'a heat-shimmer with intent. Every six seconds or so the '
      + 'camouflage swallows and the whole animal rings visible for a '
      + 'breath; the scope gets that breath and nothing else. It hurts '
      + 'to touch. You will not see it to ram it. The klaxon exists '
      + 'for this animal.',
    visual: 'nearly invisible cloaked alien predator, faint transparent '
      + 'silhouette bending light like heat shimmer, brief decloaking '
      + 'flash revealing a ghostly veil body around a faceted '
      + 'crystalline core, predator-style optical camouflage effect, '
      + 'night battlefield, one searchlight, photoreal VFX, 8k',
  },
};

// The world entries double as unit entries where the catalogue shows the
// same thing (the relay and the gate live in both places) — one text, two
// homes, no drift.
for (const w of LORE_WORLD) if (!LORE[w.id]) LORE[w.id] = w;

// one entry, formatted for the clipboard
export function loreText(e) {
  return `${e.name} — ${e.tag}\n\n${e.body}\n\nVISUAL PROMPT:\n${e.visual}`;
}

// the whole codex, world first, then every unit in the given id order
export function loreAll(ids) {
  const parts = LORE_WORLD.map(loreText);
  for (const id of ids) if (LORE[id]) parts.push(loreText(LORE[id]));
  return parts.join('\n\n' + '─'.repeat(40) + '\n\n');
}

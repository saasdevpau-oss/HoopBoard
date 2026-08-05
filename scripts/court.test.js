/**
 * Tests unitaires du composant terrain (assets/court.js).
 * Sans dépendance : lancer `node scripts/court.test.js` (exit 1 si échec).
 * Couvre getShotValue et getCourtZone (brief section 25).
 */
const Court = require('../assets/court.js');

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) { pass++; }
  else { fail++; console.error(`  ✗ ${name}\n      attendu: ${expected}\n      obtenu : ${actual}`); }
}
// point à partir de coordonnées terrain réelles (mètres) -> normalisé 0..100
function P(mx, my) { return { x: mx / Court.GEOMETRY.W * 100, y: my / Court.GEOMETRY.L * 100 }; }
const B = Court.GEOMETRY.basket; // {x:7.5, y:1.575}

console.log('— getShotValue —');
check('sous le panier = 2',              Court.getShotValue(P(B.x, B.y)), 2);
check('centre raquette = 2',             Court.getShotValue(P(7.5, 3.5)), 2);
check('raquette gauche = 2',             Court.getShotValue(P(6.0, 3.5)), 2);
check('raquette droite = 2',             Court.getShotValue(P(9.0, 3.5)), 2);
check('mi-distance axe = 2',             Court.getShotValue(P(7.5, 8.0)), 2);
check('mi-distance aile gauche = 2',     Court.getShotValue(P(3.5, 5.5)), 2);
check('mi-distance aile droite = 2',     Court.getShotValue(P(11.5, 5.5)), 2);
check('devant la ligne 3pts = 2',        Court.getShotValue(P(7.5, 8.2)), 2);
check('EXACTEMENT sur la ligne = 2',     Court.getShotValue(P(7.5, B.y + 6.75)), 2);
check('derrière l’arc = 3',              Court.getShotValue(P(7.5, 8.9)), 3);
check('corner gauche devant ligne = 2',  Court.getShotValue(P(1.3, 1.0)), 2);
check('corner gauche derrière ligne = 3',Court.getShotValue(P(0.5, 1.0)), 3);
check('corner droit devant ligne = 2',   Court.getShotValue(P(13.7, 1.0)), 2);
check('corner droit derrière ligne = 3', Court.getShotValue(P(14.5, 1.0)), 3);
// robustesse : clairement derrière l'arc sur les ailes (d > 6.75 m)
check('aile gauche 3pts = 3',            Court.getShotValue(P(2.5, 6.6)), 3);
check('aile droite 3pts = 3',            Court.getShotValue(P(12.5, 6.6)), 3);

console.log('— getCourtZone —');
check('sous le panier -> restricted-center', Court.getCourtZone(P(B.x, B.y)).id, 'restricted-area-center');
check('cercle gauche -> restricted-left',    Court.getCourtZone(P(6.6, 1.575)).id, 'restricted-area-left');
check('cercle droit -> restricted-right',    Court.getCourtZone(P(8.4, 1.575)).id, 'restricted-area-right');
check('centre raquette -> paint-center',     Court.getCourtZone(P(7.5, 3.5)).id, 'paint-center');
check('raquette gauche -> paint-left',       Court.getCourtZone(P(5.6, 3.5)).id, 'paint-left');
check('raquette droite -> paint-right',      Court.getCourtZone(P(9.4, 3.5)).id, 'paint-right');
check('mi-distance axe -> midrange-center',  Court.getCourtZone(P(7.5, 8.0)).id, 'midrange-center');
check('mi-distance aile gauche -> wing-left',Court.getCourtZone(P(3.5, 5.5)).id, 'midrange-wing-left');
check('mi-distance aile droite -> wing-right',Court.getCourtZone(P(11.5, 5.5)).id, 'midrange-wing-right');
check('derrière l’arc axe -> three-top',     Court.getCourtZone(P(7.5, 8.9)).id, 'three-top');
check('corner gauche 3 -> three-corner-left', Court.getCourtZone(P(0.5, 1.0)).id, 'three-corner-left');
check('corner droit 3 -> three-corner-right', Court.getCourtZone(P(14.5, 1.0)).id, 'three-corner-right');
check('aile gauche 3 -> three-wing-left',    Court.getCourtZone(P(2.5, 6.6)).id, 'three-wing-left');
check('aile droite 3 -> three-wing-right',   Court.getCourtZone(P(12.5, 6.6)).id, 'three-wing-right');

console.log('— hors terrain —');
check('inCourt(-5) = false',   Court.inCourt({ x: -5, y: 50 }), false);
check('inCourt(105) = false',  Court.inCourt({ x: 105, y: 50 }), false);
check('zone hors terrain',     Court.getCourtZone({ x: -5, y: 50 }).id, 'out-of-bounds');
check('inCourt(50,50) = true', Court.inCourt({ x: 50, y: 50 }), true);

/* Couverture exhaustive : aucun trou ni chevauchement.
   Chaque point de l'intérieur du demi-terrain doit renvoyer exactement une
   zone connue (la fonction fait autorité -> partition complète par construction). */
console.log('— couverture (aucun trou) —');
let holes = 0, unknown = 0, total = 0;
for (let ny = 0.5; ny < 100; ny += 0.5) {
  for (let nx = 0.5; nx < 100; nx += 0.5) {
    total++;
    const z = Court.getCourtZone({ x: nx, y: ny });
    if (!z || !z.id) { holes++; continue; }
    if (z.id !== 'out-of-bounds' && !Court.ZONES[z.id]) unknown++;
  }
}
check('aucun trou de zone', holes, 0);
check('aucune zone inconnue', unknown, 0);
check('18 zones définies', Court.ZONE_IDS.length, 18);
console.log(`  (${total} points échantillonnés)`);

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);

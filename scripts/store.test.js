/**
 * Tests du store (assets/store.js) : le box score DÉRIVÉ des événements
 * doit reproduire les totaux officiels du match Žalgiris–Hapoel.
 * Lancer : node scripts/store.test.js
 */
const Store = require('../assets/store.js');
const DATA = require('../lib/data.js');

let pass = 0, fail = 0;
function check(name, actual, expected) {
  if (actual === expected) pass++;
  else { fail++; console.error(`  ✗ ${name}\n      attendu: ${expected}\n      obtenu : ${actual}`); }
}

console.log('— matchs —');
const matches = Store.getMatches();
check('5 matchs (4 résultats + prochain)', matches.length, 5);
check('getMatch("hapoel") existe', !!Store.getMatch('hapoel'), true);
check('résolution souple "hapoel-tel-aviv"', Store.getMatch('hapoel-tel-aviv') ? Store.getMatch('hapoel-tel-aviv').id : null, 'hapoel');
check('match inconnu -> null', Store.getMatch('zzz'), null);
check('prochain match = upcoming', Store.getMatch('fenerbahce').status, 'upcoming');

console.log('— box score dérivé des événements (Žalgiris) —');
const bs = Store.getBoxScore('hapoel');
check('dérivé des événements', bs.derivedFromEvents, true);
check('12 joueurs Žalgiris', bs.home.players.length, 12);
const T = bs.home.totals, OFF = DATA.matchHapoel.totauxEquipe;
check('total points = score (93)', T.pts, 93);
check('total points = score home', T.pts, bs.home.score);
check('2pts réussis dérivés = officiel', T.p2m, OFF.p2.r);
check('2pts tentés dérivés = officiel', T.p2a, OFF.p2.t);
check('3pts réussis dérivés = officiel', T.p3m, OFF.p3.r);
check('3pts tentés dérivés = officiel', T.p3a, OFF.p3.t);
check('LF réussis dérivés = officiel', T.ftm, OFF.lf.r);
check('LF tentés dérivés = officiel', T.fta, OFF.lf.t);
check('rebonds off dérivés = officiel', T.ro, OFF.rebonds.off);
check('rebonds déf dérivés = officiel', T.rd, OFF.rebonds.def);
check('passes déc. dérivées = officiel', T.pd, OFF.passes);
check('interceptions dérivées = officiel', T.int, OFF.interceptions);
check('contres dérivés = officiel', T.ct, OFF.contres);
check('pertes dérivées = officiel', T.bp, OFF.ballesPerdues);
check('fautes dérivées = officiel', T.fa, OFF.fautes);

console.log('— joueur repère (Moses Wright, 8-10 à 2pts, 9-9 LF) —');
const wright = bs.home.players.find((p) => p.name === 'Moses Wright');
check('Wright pts dérivés = 25', wright.pts, 25);
check('Wright 2pts = 8/10', `${wright.p2m}/${wright.p2a}`, '8/10');
check('Wright LF = 9/9', `${wright.ftm}/${wright.fta}`, '9/9');
check('Wright #7', wright.num, 7);
check('Wright titulaire (24 min)', wright.starter, true);

console.log('— quart-temps —');
const q = Store.getQuarters('hapoel');
check('Q home somme = 93', q.home.reduce((a, b) => a + b, 0), 93);
check('Q away somme = 82', q.away.reduce((a, b) => a + b, 0), 82);

console.log('— adversaire (détail non publié) —');
check('joueurs Hapoel = null (état vide)', bs.away.players, null);
check('Hapoel total pts = 82', bs.away.totals.pts, 82);

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);

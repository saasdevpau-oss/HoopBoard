/**
 * Tests du moteur de saison (assets/season.js).
 *
 * Ce que l'on vérifie — l'essentiel du contrat de la page SAISON :
 *   1. la saison est DÉRIVÉE des événements (rien n'est codé en dur) ;
 *   2. ses agrégats reproduisent EXACTEMENT les repères publiés ailleurs
 *      dans l'app (statsSaison.equipe, tournoi.bilan) ;
 *   3. les 4 matchs réels gardent leurs scores et box scores officiels ;
 *   4. chaque tir porte une zone valide du composant terrain.
 *
 * Lancer : node scripts/season.test.js
 */
const Season = require('../assets/season.js');
const Store = require('../assets/store.js');
const Court = require('../assets/court.js');
const EV = require('../lib/match-events.js');
const DATA = require('../lib/data.js');

let pass = 0, fail = 0;
function check(name, actual, expected) {
  if (actual === expected) pass++;
  else { fail++; console.error(`  ✗ ${name}\n      attendu: ${expected}\n      obtenu : ${actual}`); }
}
function ok(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.error(`  ✗ ${name}${detail ? '\n      ' + detail : ''}`); }
}
const sum = (a) => a.reduce((x, y) => x + y, 0);
const r1 = (n) => Math.round(n * 10) / 10;

const S = Season.get();
const REF = DATA.statsSaison.equipe;

console.log('— structure de la saison —');
check('38 matchs', S.N, 38);
check('4 matchs réels', S.games.filter((g) => g.real).length, 4);
check('34 matchs de démonstration', S.demoGames, 34);
ok('tous les matchs ont des événements', S.games.every((g) => g.events.length > 100));
ok('la saison se termine sur un match réel (page d’analyse existante)', S.lastGame.real === true, 'dernier: ' + S.lastGame.date);
ok('dates strictement croissantes', S.games.every((g, i) => i === 0 || S.games[i - 1].date < g.date));
check('un prochain match est disponible', S.nextMatch ? S.nextMatch.id : null, 'fenerbahce');

console.log('— le score de chaque match est DÉRIVÉ de ses événements —');
let derived = 0;
S.games.forEach((g) => {
  const us = Season._internals.totalsFromEvents(g.events, false);
  const them = Season._internals.totalsFromEvents(g.events, true);
  if (us.pts === g.us && them.pts === g.them) derived++;
});
check('38 scores reconstruits depuis les événements', derived, 38);

console.log('— bilan officiel —');
check('victoires', S.record.w, DATA.tournoi.bilan.victoires);
check('défaites', S.record.l, DATA.tournoi.bilan.defaites);
ok('chaque victoire a bien un score supérieur', S.games.every((g) => (g.us > g.them) === g.win));

console.log('— agrégats identiques aux repères publiés (statsSaison.equipe) —');
[['pts', 'points marqués'], ['ptsContre', 'points encaissés'], ['p2Pct', '% à 2 pts'],
 ['p3Pct', '% à 3 pts'], ['lfPct', '% aux lancers'], ['ro', 'rebonds offensifs'],
 ['rd', 'rebonds défensifs'], ['reb', 'rebonds'], ['pd', 'passes'], ['int', 'interceptions'],
 ['ct', 'contres'], ['bp', 'pertes de balle'], ['fa', 'fautes']]
  .forEach(([k, label]) => check(label, S.perGame[k], REF[k]));
check('différentiel', S.perGame.diff, r1(REF.pts - REF.ptsContre));

console.log('— matchs réels : données officielles préservées —');
['paris', 'hapoel', 'olympiacos', 'real-madrid'].forEach((id) => {
  const g = S.games.find((x) => x.matchId === id);
  const m = Store.getMatch(id), bs = Store.getBoxScore(id);
  ok(id + ' : score officiel', !!g && g.us === m.home.score && g.them === m.away.score,
    g ? `${g.us}-${g.them} vs ${m.home.score}-${m.away.score}` : 'match absent');
  ok(id + ' : totaux du box score officiel', !!g && g.totals.p2m === bs.home.totals.p2m
    && g.totals.p3m === bs.home.totals.p3m && g.totals.ftm === bs.home.totals.ftm
    && g.totals.pd === bs.home.totals.pd && g.totals.bp === bs.home.totals.bp);
  const q = Store.getQuarters(id);
  if (q) ok(id + ' : quart-temps officiels', g.quarters.us.join(',') === q.home.join(','));
});

console.log('— événements : types et zones valides —');
const TYPES = EV.EVENT_TYPE_LIST;
let badType = 0, badZone = 0, shots = 0, oppShots = 0, withPeriod = 0, subs = 0;
S.games.forEach((g) => g.events.forEach((e) => {
  if (TYPES.indexOf(e.type) === -1) badType++;
  if (e.type === EV.EVENT_TYPES.SUBSTITUTION) subs++;
  if (e.type === EV.EVENT_TYPES.SHOT_MADE || e.type === EV.EVENT_TYPES.SHOT_MISSED) {
    const z = e.meta && e.meta.zone;
    if (!z || !Court.ZONES[z]) badZone++;
    else if (Court.ZONES[z].value !== e.meta.value) badZone++;
    else if (Court.getCourtZone({ x: e.meta.x, y: e.meta.y }).id !== z) badZone++;
    if (e.meta && e.meta.opponent) oppShots++; else shots++;
    if (e.period) withPeriod++;
  }
}));
check('aucun type d’événement inconnu', badType, 0);
check('aucune zone de tir invalide (position ↔ zone ↔ valeur)', badZone, 0);
ok('des remplacements sont enregistrés (base des cinq majeurs)', subs > 1000, subs + ' SUBSTITUTION');
ok('tous les tirs portent leur quart-temps', withPeriod === shots + oppShots);
check('nos tirs = total de la saison', shots, S.totals.p2a + S.totals.p3a);

console.log('— zones : cohérence des cartes —');
const ours = S.zones.ours, opp = S.zones.opp;
check('somme des tirs par zone = tirs de la saison', ours.total, S.totals.p2a + S.totals.p3a);
check('somme des paniers par zone = paniers de la saison', ours.made, S.totals.p2m + S.totals.p3m);
ok('les 18 zones du terrain sont couvertes', S.zoneIds.length === 18 && S.zoneIds.every((id) => !!Court.ZONES[id]));
ok('aucune zone à 0 tir sur la saison', S.zoneIds.every((id) => ours.zones[id].a > 0),
  S.zoneIds.filter((id) => !ours.zones[id].a).join(', '));
ok('aucun pourcentage aberrant (0 % ou 100 %) sur nos zones',
  S.zoneIds.every((id) => ours.zones[id].pct > 12 && ours.zones[id].pct < 92),
  S.zoneIds.map((id) => id + ':' + ours.zones[id].pct).join(' '));
ok('aucun pourcentage aberrant sur les zones adverses',
  S.zoneIds.every((id) => opp.zones[id].pct > 12 && opp.zones[id].pct < 92));
ok('les zones à 3 pts valent bien 3 points', S.zoneIds.filter((id) => Season.zoneValue(id) === 3)
  .every((id) => ours.zones[id].pts === ours.zones[id].m * 3));
ok('les fréquences totalisent 100 %', Math.abs(sum(S.zoneIds.map((id) => ours.zones[id].freq)) - 100) < 0.6);

console.log('— quart-temps —');
check('4 quart-temps', S.quarters.us.length, 4);
ok('la somme des quart-temps = points marqués',
  Math.abs(sum(S.quarters.us) - S.perGame.pts) < 0.3, sum(S.quarters.us) + ' vs ' + S.perGame.pts);
ok('la somme des quart-temps = points encaissés',
  Math.abs(sum(S.quarters.them) - S.perGame.ptsContre) < 0.3);
ok('aucun quart-temps aberrant', S.quarters.us.every((v) => v > 15 && v < 30), S.quarters.us.join(' '));

console.log('— découpages —');
check('domicile + extérieur = 38', S.splits.home.n + S.splits.away.n, 38);
check('victoires + défaites = 38', S.splits.wins.n + S.splits.losses.n, 38);
check('les victoires ont un différentiel positif', S.splits.wins.diff > 0, true);
check('les défaites ont un différentiel négatif', S.splits.losses.diff < 0, true);
check('5 derniers matchs', S.splits.last5.n, 5);

console.log('— analyses —');
ok('3 à 5 forces', S.strengths.length >= 3 && S.strengths.length <= 5, S.strengths.length + '');
ok('3 à 5 axes de progrès', S.improvements.length >= 3 && S.improvements.length <= 5, S.improvements.length + '');
ok('8 tendances chiffrées', S.trends.rows.length === 8);
ok('chaque tendance porte un écart', S.trends.rows.every((r) => typeof r.delta === 'number'));
ok('au moins 6 analyses IA', S.ai.length >= 6, S.ai.length + '');
ok('chaque analyse IA contient un chiffre', S.ai.every((a) => /\d/.test(a.text)));
// une analyse utile = une donnée + un point de comparaison + une lecture :
// on exige au moins trois valeurs chiffrées dans chaque texte.
ok('chaque analyse IA compare au moins deux chiffres',
  S.ai.every((a) => (a.text.match(/\d+(?:,\d+)?/g) || []).length >= 3),
  S.ai.filter((a) => (a.text.match(/\d+(?:,\d+)?/g) || []).length < 3).map((a) => a.title).join(', '));
ok('aucun texte d’analyse ne contient de placeholder', S.ai.concat(S.strengths, S.improvements)
  .every((a) => !/undefined|NaN|null/.test(a.text)));
ok('des cinq majeurs sont calculés', S.lineups.length >= 3, S.lineups.length + '');
ok('chaque cinq compte 5 joueurs', S.lineups.every((l) => l.names.length === 5));
ok('la forme des joueurs est calculée', S.form.length >= 5, S.form.length + '');

console.log('— déterminisme —');
delete require.cache[require.resolve('../assets/season.js')];
const S2 = require('../assets/season.js').get();
check('même bilan à la reconstruction', S2.record.w + '-' + S2.record.l, S.record.w + '-' + S.record.l);
check('mêmes points marqués', S2.perGame.pts, S.perGame.pts);
check('mêmes scores match par match', S2.games.map((g) => g.us + '-' + g.them).join('|'),
  S.games.map((g) => g.us + '-' + g.them).join('|'));

console.log(`\n${pass} test(s) OK, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

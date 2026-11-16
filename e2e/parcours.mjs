/**
 * Test de bout en bout dans un vrai navigateur : un organisateur monte un tournoi de zéro,
 * un joueur s'inscrit depuis son téléphone, un spectateur suit un joueur et reçoit l'appel du match.
 *
 * Prérequis : `npm run build:web`, puis un serveur vierge :
 *   PLUME_DATA_DIR=$(mktemp -d) PORT=4100 APP_URL=http://localhost:4100 PLUME_NO_PUSH=1 npm start
 * Lancement : BASE=http://localhost:4100 CHROME=/usr/bin/google-chrome npm test --workspace @plume/e2e
 */
import { chromium } from 'playwright-core'

const B = process.env.BASE ?? 'http://localhost:4100'
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const problems = []
const steps = []
const ok = (label) => { steps.push(label); console.log('  ✓', label) }
function assert(cond, label) { if (!cond) throw new Error(`Échec : ${label}`); ok(label) }
function watch(page, who) {
  page.on('console', m => { if (m.type() === 'error') problems.push(`[${who}] console : ${m.text().slice(0, 300)}`) })
  page.on('pageerror', e => problems.push(`[${who}] erreur page : ${e.message.slice(0, 300)}`))
  page.on('response', r => { if (r.status() >= 500) problems.push(`[${who}] HTTP ${r.status()} ${r.url()}`) })
}
const stamp = Date.now().toString(36)
const PW = `e2e-${stamp}-secret`
const desktop = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: 'fr-FR' })
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' })
const fan = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' })
const org = await desktop.newPage(); watch(org, 'organisateur')
const player = await phone.newPage(); watch(player, 'joueur')
const spectator = await fan.newPage(); watch(spectator, 'spectateur')
const text = async page => (await page.locator('body').innerText()).replace(/\s+/g, ' ')
const shot = (page, name) => page.screenshot({ path: `captures/${name}.png` })
// La pile de navigation garde les écrans précédents dans la page (masqués) : on ne vise que ce qui est visible.
const tid = (page, id) => page.locator(`[data-testid="${id}"]:visible`).last()
const role = (page, r, name) => page.getByRole(r, { name, exact: true }).filter({ visible: true }).last()
const txt = (page, t) => page.getByText(t).filter({ visible: true }).last()

try {
  console.log('Organisateur : création du tournoi')
  await org.goto(`${B}/orga`, { waitUntil: 'networkidle' })
  await tid(org, 'orga-login').click()
  await role(org, 'radio', 'Nouveau compte').click()
  await tid(org, 'account-name').fill('Camille Test')
  await tid(org, 'account-email').fill(`orga-${stamp}@exemple.fr`)
  await tid(org, 'account-password').fill(PW)
  await tid(org, 'account-submit').click()
  await org.waitForURL('**/orga')
  ok('compte créé et retour sur « Organiser »')
  await tid(org, 'new-tournament').click()
  await tid(org, 't-name').fill(`Tournoi E2E ${stamp}`)
  await tid(org, 't-date').fill('14/03/2027')
  await tid(org, 't-courts').fill('3')
  await tid(org, 't-create').click()
  await org.waitForURL('**/orga/*/tableaux')
  const id = org.url().split('/orga/')[1].split('/')[0]
  const slug = `tournoi-e2e-${stamp}`
  ok('tournoi créé en brouillon')

  await tid(org, 'new-category').click()
  await tid(org, 'cat-max').fill('8')
  await tid(org, 'cat-save').click()
  await tid(org, 'category-Simple hommes').waitFor()
  await tid(org, 'new-category').click()
  await role(org, 'radio', 'Double mixte').click()
  await role(org, 'radio', 'Élimination directe').click()
  await tid(org, 'cat-max').fill('4')
  await tid(org, 'cat-save').click()
  await tid(org, 'category-Double mixte').waitFor()
  ok('deux tableaux créés (poules puis tableau, élimination directe)')

  const anon = await player.request.get(`${B}/api/tournaments/${slug}`)
  assert(anon.status() === 404, 'le brouillon est invisible du public')
  await org.goto(`${B}/orga/${id}`, { waitUntil: 'networkidle' })
  await tid(org, 'publish').click()
  await txt(org, 'Le tournoi est en ligne.').waitFor()
  ok('tournoi publié')

  console.log('Joueur (téléphone) : inscription en ligne')
  await player.goto(`${B}/t/${slug}`, { waitUntil: 'networkidle' })
  await tid(player, 'cta-register').click()
  await tid(player, 'reg-submit').click()
  assert((await text(player)).includes('Indiquez votre prénom et votre nom'), 'le formulaire vide est refusé avec un message clair')
  await tid(player, 'reg-firstname').fill('léa')
  await tid(player, 'reg-lastname').fill('martin')
  await tid(player, 'reg-email').fill(`lea-${stamp}@exemple.fr`)
  await tid(player, 'reg-cat-Double mixte').click()
  await tid(player, 'reg-submit').click()
  assert((await text(player)).includes('partenaire pour « Double mixte »'), 'le partenaire est exigé en double')
  await tid(player, 'reg-partner-firstname-Double mixte').fill('Hugo')
  await tid(player, 'reg-partner-lastname-Double mixte').fill('Petit')
  await tid(player, 'reg-submit').click()
  await tid(player, 'registration-sent').waitFor()
  await shot(player, 'inscription-envoyee')
  const mails = await (await player.request.get(`${B}/api/dev/outbox`)).json()
  const mail = mails.find(m => m.to === `lea-${stamp}@exemple.fr`)
  assert(!!mail && mail.subject.startsWith('Confirmez votre inscription'), 'mail de confirmation envoyé')
  const token = /token=([\w-]+)/.exec(mail.body)[1]
  await player.goto(`${B}/confirmer?token=${token}`, { waitUntil: 'networkidle' })
  await txt(player, 'Adresse confirmée').waitFor()
  ok('adresse confirmée depuis le lien du mail')

  console.log('Organisateur : inscriptions')
  await org.goto(`${B}/orga/${id}/inscriptions`, { waitUntil: 'networkidle' })
  await tid(org, 'accept-Léa MARTIN / Hugo PETIT').click()
  await org.waitForFunction(() => ![...document.querySelectorAll('[data-testid^="accept-"]')].some(e => e.offsetParent))
  const mails2 = await (await player.request.get(`${B}/api/dev/outbox`)).json()
  assert(mails2.some(m => m.to === `lea-${stamp}@exemple.fr` && m.subject.startsWith('Inscription validée')), 'le joueur reçoit le mail de validation')
  await tid(org, 'add-registration').click()
  for (let i = 1; i <= 7; i++) {
    await tid(org, 'add-firstname').fill(`Joueur${i}`)
    await tid(org, 'add-lastname').fill(`Simple${i}`)
    await tid(org, 'add-confirm').click()
    await org.waitForFunction(() => [...document.querySelectorAll('[data-testid="add-firstname"]')].some(e => e.offsetParent && e.value === ''))
  }
  await role(org, 'radio', 'Double mixte').click()
  for (let i = 1; i <= 2; i++) {
    await tid(org, 'add-firstname').fill(`Homme${i}`)
    await tid(org, 'add-lastname').fill(`Mixte${i}`)
    await tid(org, 'add-partner-firstname').fill(`Femme${i}`)
    await tid(org, 'add-partner-lastname').fill(`Mixte${i}`)
    await tid(org, 'add-confirm').click()
    await org.waitForFunction(() => [...document.querySelectorAll('[data-testid="add-firstname"]')].some(e => e.offsetParent && e.value === ''))
  }
  await role(org, 'button', 'Fermer').click()
  let snap = await (await org.request.get(`${B}/api/tournaments/${slug}`)).json()
  assert(snap.categories[0].counts.accepted === 7 && snap.categories[1].counts.accepted === 3, 'inscriptions manuelles enregistrées (7 en simple, 3 paires en mixte)')

  console.log('Organisateur : tirage et lancement')
  await org.goto(`${B}/orga/${id}/tableaux`, { waitUntil: 'networkidle' })
  await tid(org, 'draw-Simple hommes').click()
  await tid(org, 'draw-confirm').click()
  await tid(org, 'undraw-Simple hommes').waitFor()
  await tid(org, 'draw-Double mixte').click()
  await tid(org, 'draw-confirm').click()
  await tid(org, 'undraw-Double mixte').waitFor()
  snap = await (await org.request.get(`${B}/api/tournaments/${slug}`)).json()
  assert(snap.categories[0].pools.length === 2 && snap.matches.length > 10, `tirage fait : ${snap.categories[0].pools.length} poules, ${snap.matches.length} matchs`)
  await org.goto(`${B}/orga/${id}`, { waitUntil: 'networkidle' })
  await tid(org, 'start-tournament').click()
  await tid(org, 'auto-call').waitFor()
  ok('tournoi démarré, salle de contrôle affichée')

  console.log('Spectateur (téléphone) : suit un joueur depuis le QR code')
  await spectator.goto(`${B}/t/${slug}/moi`, { waitUntil: 'networkidle' })
  await tid(spectator, 'choose-me').click()
  // on suit un joueur du tout premier match prévu
  const first = snap.matches.filter(m => m.entry1Id && m.entry2Id).sort((a, b) => a.number - b.number)[0]
  const entry = snap.categories.flatMap(c => c.entries).find(e => e.id === first.entry1Id)
  await tid(spectator, 'player-search').fill(entry.players[0].name.split(' ')[0])
  await tid(spectator, `player-${entry.players[0].id}`).click()
  await tid(spectator, `next-${entry.players[0].id}`).waitFor()
  assert((await text(spectator)).includes('Prochain match, heure estimée'.toUpperCase()) || (await text(spectator)).toLowerCase().includes('prochain match, heure estimée'), 'le joueur suivi voit son heure de passage estimée')
  await shot(spectator, 'suivi-avant-appel')

  await tid(org, 'auto-call').click()
  await tid(org, `start-${first.number}`).waitFor()
  ok('terrains remplis automatiquement')
  await tid(spectator, 'live-alert').waitFor({ timeout: 15000 })
  assert((await tid(spectator, 'live-alert').innerText()).includes('Appel'), 'le spectateur reçoit l\'alerte d\'appel en direct, sans recharger')
  await txt(spectator, 'Match appelé, présentez-vous').waitFor()
  await shot(spectator, 'suivi-appel')
  ok('son écran affiche le terrain en grand')

  console.log('Organisateur : scores')
  await tid(org, `start-${first.number}`).click()
  await tid(org, `score-${first.number}`).click()
  await tid(org, 'point-1').waitFor()
  for (let i = 0; i < 3; i++) { await tid(org, 'point-2').click(); await org.waitForTimeout(120) }
  await tid(org, 'undo-point').click()
  await org.waitForTimeout(300)
  snap = await (await org.request.get(`${B}/api/tournaments/${slug}`)).json()
  assert(JSON.stringify(snap.matches.find(m => m.id === first.id).sets) === '[{"a":0,"b":2}]', 'score point par point, avec annulation du dernier point')
  await spectator.goto(`${B}/t/${slug}/match/${first.id}`, { waitUntil: 'networkidle' })
  await shot(spectator, 'match-en-direct')
  await tid(org, 'set-1-a').fill('23')
  await tid(org, 'set-1-b').fill('5')
  assert((await text(org)).includes('est impossible'), 'un score impossible (23-5) est refusé avant l\'envoi')
  await tid(org, 'set-1-a').fill('21')
  await tid(org, 'set-1-b').fill('17')
  await tid(org, 'set-2-a').fill('21')
  await tid(org, 'set-2-b').fill('19')
  await tid(org, 'save-result').click()
  await org.waitForURL(`**/orga/${id}`)
  await txt(spectator, 'Terminé').waitFor({ timeout: 15000 })
  ok('résultat enregistré, visible en direct côté spectateur')

  console.log('Organisateur : imprévus')
  await org.goto(`${B}/orga/${id}/tableaux`, { waitUntil: 'networkidle' })
  await tid(org, 'edit-Simple hommes').click()
  await org.getByRole('radio', { name: '1 set de 21', exact: true }).filter({ visible: true }).first().click()
  await tid(org, 'cat-save').click()
  await txt(org, 'Poules : 1 set de 21').waitFor()
  ok('format de score raccourci en cours de tournoi')
  snap = await (await org.request.get(`${B}/api/tournaments/${slug}`)).json()
  const doneMatch = snap.matches.find(m => m.id === first.id)
  assert(doneMatch.rulesText.includes('2 sets gagnants') && snap.matches.find(m => m.categoryId === doneMatch.categoryId && m.phase === 'pool' && m.status === 'pending').rulesText.includes('1 set de 21'), 'le match déjà joué garde son format, les suivants prennent le nouveau')
  await org.goto(`${B}/orga/${id}/inscriptions`, { waitUntil: 'networkidle' })
  const loser = snap.categories.flatMap(c => c.entries).find(e => e.id === first.entry2Id)
  await tid(org, `withdraw-${loser.name}`).click()
  await tid(org, 'withdraw-confirm').click()
  await org.waitForFunction(() => ![...document.querySelectorAll('[data-testid="withdraw-confirm"]')].some(e => e.offsetParent))
  snap = await (await org.request.get(`${B}/api/tournaments/${slug}`)).json()
  const lm = snap.matches.filter(m => m.entry1Id === loser.id || m.entry2Id === loser.id)
  assert(lm.every(m => m.status === 'completed') && lm.some(m => m.resultType === 'walkover'), 'retrait d\'un joueur : ses matchs restants passent en forfait')
  await org.goto(`${B}/orga/${id}/journal`, { waitUntil: 'networkidle' })
  const j = await text(org)
  assert(j.includes('format de score changé') && j.includes('Retrait de'), 'les imprévus sont tracés au journal')
  await org.goto(`${B}/orga/${id}`, { waitUntil: 'networkidle' })
  await txt(org, 'Fermer').click().catch(() => {})
  await shot(org, 'pilotage')

  console.log('Public : tableaux et historique')
  await player.goto(`${B}/t/${slug}/tableaux`, { waitUntil: 'networkidle' })
  await tid(player, 'pool-Poule A').waitFor()
  await shot(player, 'tableaux-mobile')
  const winner = snap.categories.flatMap(c => c.entries).find(e => e.id === first.entry1Id)
  await player.goto(`${B}/joueur/${winner.players[0].id}`, { waitUntil: 'networkidle' })
  assert((await text(player)).includes('21-17'), 'l\'historique du joueur montre son match')
  for (const [page, who] of [[player, 'joueur'], [spectator, 'spectateur'], [org, 'organisateur']]) {
    const w = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (w > 2) problems.push(`[${who}] débordement horizontal de ${w}px sur ${page.url()}`)
  }
  assert(problems.length === 0, `aucune erreur console, réseau ou de mise en page${problems.length ? ' :\n' + problems.join('\n') : ''}`)
  console.log(`\nParcours complet réussi : ${steps.length} vérifications.`)
} catch (e) {
  console.error('\n' + e.message)
  if (problems.length) console.error(problems.join('\n'))
  for (const [p, n] of [[org, 'echec-organisateur'], [player, 'echec-joueur'], [spectator, 'echec-spectateur']]) await shot(p, n).catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
}

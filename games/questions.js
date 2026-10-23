/* SpitzQ - shared question file for the SpitzVerse grammar arcade.
   Every game loads this one file. Add a skill by writing a generator and
   adding a SETS entry at the END of the list (never reorder: score codes
   store a set's position).

   var Q = SpitzQ.make(setIndex, [topicIndexes]);   // or SpitzQ.forGame('gb')
   var q = Q.next();
   // q = { topic, prompt (HTML), choices:[{html, ok, key, why} x4], explain, visual }
*/
var SpitzQ = (function () {
  'use strict';

  /* ---------- helpers ---------- */
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) {
    var b = a.slice(), i, j, t;
    for (i = b.length - 1; i > 0; i--) { j = rnd(i + 1); t = b[i]; b[i] = b[j]; b[j] = t; }
    return b;
  }
  function sample(a, n) { return shuffle(a).slice(0, n); }
  function qt(w) { return '\u201C' + w + '\u201D'; }
  function an(w) { return (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w; }
  function U(w) { return '<span class="tgt">' + w + '</span>'; }
  function sentBox(html) { return '<div class="sent">' + html + '</div>'; }
  // "The cat [chased] the mouse." -> underlines whatever is in [ ]
  function br(str) { return str.replace(/\[([^\]]+)\]/g, function (_, w) { return U(w); }); }
  function plain(str) { return str.replace(/\[([^\]]+)\]/g, '$1'); }
  function words(str) { var out = [], m, re = /\[([^\]]+)\]/g; while ((m = re.exec(str))) out.push(m[1]); return out; }

  // Build one question. wrongs = [{t, why}] (at least 3 distinct from right).
  function mk(prompt, right, wrongs, explain) {
    var seen = {}, ws = [];
    seen[right] = 1;
    shuffle(wrongs).forEach(function (w) {
      if (!seen[w.t] && ws.length < 3) { seen[w.t] = 1; ws.push(w); }
    });
    if (ws.length < 3) return null;
    var ch = [{ html: right, ok: true, why: '' }].concat(ws.map(function (w) {
      return { html: w.t, ok: false, why: w.why };
    }));
    ch = shuffle(ch);
    ch.forEach(function (c, i) { c.key = String(i + 1); });
    return { topic: '', prompt: prompt, choices: ch, explain: explain, visual: null };
  }

  // The independent check every question must pass before a game sees it.
  function valid(q) {
    if (!q || !q.prompt || !q.explain || !q.choices || q.choices.length !== 4) return false;
    var ok = 0, seen = {}, i, c;
    for (i = 0; i < 4; i++) {
      c = q.choices[i];
      if (!c.html || seen[c.html]) return false;
      seen[c.html] = 1;
      if (c.ok) ok++;
      else if (!c.why) return false;
    }
    return ok === 1;
  }

  /* ---------- parts of speech: tagged sentences ----------
     word/pos   pos = n pron v adj adv prep conj intj art
     pos! = skip as a distractor (possessives, articles)
     adj>word   the word it describes     prep>word   its object
     adv>word@how|when|where|extent       punctuation tokens stick to the word before */
  var POS = {
    n:    { name: 'noun',         why: 'names a person, place, thing, or idea' },
    pron: { name: 'pronoun',      why: 'takes the place of a noun' },
    v:    { name: 'verb',         why: 'shows an action or a state of being' },
    adj:  { name: 'adjective',    why: 'describes a noun or pronoun' },
    adv:  { name: 'adverb',       why: 'tells how, when, where, or to what extent' },
    prep: { name: 'preposition',  why: 'shows how a noun or pronoun relates to another word' },
    conj: { name: 'conjunction',  why: 'joins words or groups of words' },
    intj: { name: 'interjection', why: 'shows strong feeling all by itself' }
  };
  var POSKEYS = ['n', 'pron', 'v', 'adj', 'adv', 'prep', 'conj', 'intj'];

  var SENT_SRC = [
    "The/art tired/adj>dog dog/n slept/v on/prep>porch the/art porch/n .",
    "My/pron! sister/n quickly/adv>finished@how finished/v her/pron! homework/n .",
    "Wow/intj , the/art movie/n was/v really/adv>funny@extent funny/adj !",
    "Maria/n and/conj Jake/n walked/v to/prep>school school/n together/adv>walked .",
    "Ouch/intj , the/art hot/adj>pan pan/n burned/v me/pron !",
    "The/art friendly/adj>clerk clerk/n handed/v us/pron a/art receipt/n .",
    "We/pron ate/v lunch/n under/prep>tree a/art big/adj>tree tree/n .",
    "Tyrone/n sings/v loudly/adv>sings@how , but/conj he/pron plays/v guitar/n softly/adv>plays@how .",
    "The/art cold/adj>wind wind/n blew/v across/prep>field the/art empty/adj>field field/n .",
    "A/art brave/adj>firefighter firefighter/n rescued/v the/art puppy/n from/prep>building the/art tall/adj>building building/n .",
    "Because/conj it/pron rained/v , we/pron stayed/v indoors/adv>stayed@where .",
    "Dana/n painted/v the/art fence/n carefully/adv>painted@how , and/conj Luis/n helped/v her/pron .",
    "Hey/intj , you/pron dropped/v your/pron! keys/n .",
    "The/art noisy/adj>crowd crowd/n cheered/v when/conj the/art team/n scored/v .",
    "She/pron bought/v fresh/adj>bread bread/n and/conj sweet/adj>jam jam/n .",
    "Our/pron! neighbors/n built/v a/art tiny/adj>house house/n beside/prep>river the/art river/n .",
    "Well/intj , the/art answer/n was/v obvious/adj .",
    "He/pron often/adv>walks@when walks/v his/pron! dog/n through/prep>park the/art park/n .",
    "Nobody/pron heard/v the/art soft/adj>music music/n until/conj the/art band/n stopped/v .",
    "The/art young/adj>players players/n practiced/v daily/adv>practiced@when .",
    "Aiden/n and/conj I/pron ate/v pizza/n after/prep>game the/art game/n .",
    "Sadly/adv , the/art old/adj>bridge bridge/n collapsed/v .",
    "Whew/intj ! We/pron finally/adv>reached@when reached/v the/art top/n .",
    "The/art tall/adj>girl girl/n spoke/v clearly/adv>spoke@how to/prep>class the/art whole/adj>class class/n .",
    "Several/adj>students students/n joined/v the/art club/n because/conj they/pron loved/v music/n .",
    "The/art shy/adj>kitten kitten/n hid/v behind/prep>couch the/art couch/n .",
    "Ugh/intj , the/art bus/n is/v late/adj again/adv .",
    "My/pron! cousin/n lives/v near/prep>lake a/art large/adj>lake lake/n .",
    "Everyone/pron clapped/v loudly/adv>clapped@how when/conj the/art singer/n finished/v .",
    "The/art chef/n chopped/v onions/n quickly/adv>chopped@how and/conj stirred/v the/art soup/n .",
    "They/pron waited/v patiently/adv>waited@how in/prep>line the/art long/adj>line line/n .",
    "Oh/intj , I/pron forgot/v my/pron! lunch/n !",
    "Rosa/n gave/v her/pron! brother/n a/art gift/n for/prep>birthday his/pron! birthday/n .",
    "The/art kids/n played/v outside/adv>played@where until/conj it/pron got/v dark/adj .",
    "The/art very/adv>old@extent old/adj>house house/n creaked/v loudly/adv>creaked@how ."
  ];

  function parseSent(str) {
    var toks = [];
    str.split(' ').forEach(function (p) {
      if (!p) return;
      if (p.indexOf('/') < 0) { toks[toks.length - 1].after += p; return; }
      var parts = p.split('/'), w = parts[0], rest = parts[1], tag = null, link = null, amb = false;
      var at = rest.split('@'); rest = at[0]; tag = at[1] || null;
      var gt = rest.split('>'); rest = gt[0]; link = gt[1] || null;
      if (rest.charAt(rest.length - 1) === '!') { amb = true; rest = rest.slice(0, -1); }
      if (rest === 'art') amb = true;
      toks.push({ w: w, pos: rest, link: link, tag: tag, amb: amb, after: '' });
    });
    return toks;
  }
  var SENTS = SENT_SRC.map(parseSent);

  function render(toks, hi) {
    return toks.map(function (t, i) { return (i === hi ? U(t.w) : t.w) + t.after; }).join(' ');
  }
  function shown(t, i) { return (i === 0 && t.pos !== 'n') ? t.w.toLowerCase() : t.w; }
  function idxOf(toks, w) {
    for (var i = 0; i < toks.length; i++) if (toks[i].w.toLowerCase() === w.toLowerCase()) return i;
    return -1;
  }

  // "Which word in this sentence is a verb?"
  function whichWord(posList) {
    for (var tries = 0; tries < 40; tries++) {
      var toks = pick(SENTS), cands = [];
      toks.forEach(function (t, i) { if (!t.amb && posList.indexOf(t.pos) >= 0) cands.push(i); });
      if (!cands.length) continue;
      var ti = pick(cands), t = toks[ti], pool = [], seen = {};
      seen[t.w.toLowerCase()] = 1;
      toks.forEach(function (x, i) {
        if (!x.amb && x.pos !== t.pos && !seen[x.w.toLowerCase()]) { seen[x.w.toLowerCase()] = 1; pool.push({ x: x, i: i }); }
      });
      if (pool.length < 3) continue;
      var wr = sample(pool, 3).map(function (o) {
        return { t: shown(o.x, o.i), why: qt(shown(o.x, o.i)) + ' is ' + an(POS[o.x.pos].name) + ', not ' + an(POS[t.pos].name) + '.' };
      });
      return mk('Which word in this sentence is ' + an(POS[t.pos].name) + '?' + sentBox(render(toks, -1)),
        shown(t, ti), wr,
        qt(shown(t, ti)) + ' is ' + an(POS[t.pos].name) + ' \u2014 it ' + POS[t.pos].why + '.');
    }
    return null;
  }

  // "What part of speech is the underlined word?"
  function posName(posList) {
    for (var tries = 0; tries < 40; tries++) {
      var toks = pick(SENTS), cands = [];
      toks.forEach(function (t, i) { if (!t.amb && posList.indexOf(t.pos) >= 0) cands.push(i); });
      if (!cands.length) continue;
      var ti = pick(cands), t = toks[ti];
      var others = POSKEYS.filter(function (k) { return k !== t.pos; });
      var wr = sample(others, 4).map(function (k) {
        return { t: POS[k].name, why: 'A ' + POS[k].name + ' ' + POS[k].why + '. ' + qt(shown(t, ti)) + ' doesn\u2019t do that here.' };
      });
      return mk('What part of speech is the underlined word?' + sentBox(render(toks, ti)),
        POS[t.pos].name, wr,
        qt(shown(t, ti)) + ' is ' + an(POS[t.pos].name) + ' \u2014 it ' + POS[t.pos].why + '.');
    }
    return null;
  }

  // adjectives/adverbs: which word does it describe? prepositions: which word is its object?
  function describe(posList) {
    for (var tries = 0; tries < 40; tries++) {
      var toks = pick(SENTS), cands = [];
      toks.forEach(function (t, i) { if (t.link && posList.indexOf(t.pos) >= 0 && idxOf(toks, t.link) >= 0) cands.push(i); });
      if (!cands.length) continue;
      var ti = pick(cands), t = toks[ti], li = idxOf(toks, t.link), L = toks[li];
      var pool = [], seen = {};
      seen[L.w.toLowerCase()] = 1; seen[t.w.toLowerCase()] = 1;
      toks.forEach(function (x, i) {
        if (!x.amb && !seen[x.w.toLowerCase()]) { seen[x.w.toLowerCase()] = 1; pool.push({ x: x, i: i }); }
      });
      if (pool.length < 3) continue;
      var isPrep = t.pos === 'prep';
      var prompt = isPrep
        ? 'Which word is the object of the underlined preposition?'
        : 'The underlined word is ' + an(POS[t.pos].name) + '. Which word does it describe?';
      var wr = sample(pool, 3).map(function (o) {
        var sw = shown(o.x, o.i);
        return { t: sw, why: isPrep
          ? qt(sw) + ' isn\u2019t the object \u2014 look for the noun or pronoun that ends the phrase with ' + qt(t.w) + '.'
          : qt(sw) + ' isn\u2019t the word ' + qt(shown(t, ti)) + ' goes with.' };
      });
      var rt = shown(L, li), expl;
      if (isPrep) expl = qt(rt) + ' is the object of the preposition ' + qt(t.w) + ' \u2014 together they make a prepositional phrase.';
      else if (t.pos === 'adj') expl = qt(shown(t, ti)) + ' is an adjective that describes the noun ' + qt(rt) + '.';
      else expl = qt(shown(t, ti)) + ' is an adverb that tells more about ' + qt(rt) + '.';
      return mk(prompt + sentBox(render(toks, ti)), rt, wr, expl);
    }
    return null;
  }

  // adverbs: how / when / where / to what extent
  var TAGQ = { how: 'How?', when: 'When?', where: 'Where?', extent: 'To what extent?' };
  function advTells() {
    for (var tries = 0; tries < 40; tries++) {
      var toks = pick(SENTS), cands = [];
      toks.forEach(function (t, i) { if (t.pos === 'adv' && t.tag && t.link) cands.push(i); });
      if (!cands.length) continue;
      var ti = pick(cands), t = toks[ti], L = toks[idxOf(toks, t.link)];
      var wr = Object.keys(TAGQ).filter(function (k) { return k !== t.tag; }).map(function (k) {
        return { t: TAGQ[k], why: qt(shown(t, ti)) + ' doesn\u2019t answer ' + qt(TAGQ[k]) + ' It answers ' + qt(TAGQ[t.tag]) };
      });
      return mk('The underlined adverb answers which question?' + sentBox(render(toks, ti)),
        TAGQ[t.tag], wr,
        qt(shown(t, ti)) + ' answers ' + qt(TAGQ[t.tag]) + ' about ' + qt(L.w) + '.');
    }
    return null;
  }

  /* ---------- nouns & pronouns ---------- */
  var PROPER = ['Chicago', 'Lake Erie', 'Mr. Lopez', 'Thanksgiving', 'Toyota', 'Texas', 'Mount Rushmore', 'Friday', 'Spanish'];
  var COMMON = ['city', 'lake', 'teacher', 'holiday', 'car', 'state', 'mountain', 'day', 'language', 'river', 'school', 'doctor', 'bridge', 'country', 'store'];
  var CONCRETE = ['guitar', 'lamp', 'pizza', 'bridge', 'sneaker', 'tiger', 'notebook', 'mountain', 'window', 'bicycle', 'phone', 'pencil'];
  var ABSTRACT = ['honesty', 'bravery', 'friendship', 'freedom', 'kindness', 'courage', 'loyalty', 'patience', 'trust', 'happiness', 'peace', 'talent'];
  var GROUPS = ['team', 'flock', 'herd', 'crew', 'class', 'swarm', 'fleet', 'choir', 'pack', 'audience', 'jury', 'committee'];
  var SINGLES = ['guitar', 'lamp', 'pizza', 'sneaker', 'tiger', 'notebook', 'window', 'pencil', 'bicycle', 'phone'];

  function commonProper() {
    var askProper = Math.random() < 0.5;
    if (askProper) {
      var p = pick(PROPER);
      return mk('Which noun is a proper noun?', p,
        sample(COMMON, 3).map(function (c) { return { t: c, why: qt(c) + ' is a common noun \u2014 it names any one of a group, not one particular thing.' }; }),
        qt(p) + ' names one particular person, place, or thing, so it is a proper noun (and it is capitalized).');
    }
    var c = pick(COMMON);
    return mk('Which noun is a common noun?', c,
      sample(PROPER, 3).map(function (p) { return { t: p, why: qt(p) + ' names one particular person, place, or thing \u2014 that makes it proper.' }; }),
      qt(c) + ' names any one of a group, so it is a common noun.');
  }
  function concreteAbstract() {
    if (Math.random() < 0.5) {
      var a = pick(ABSTRACT);
      return mk('Which noun is an abstract noun?', a,
        sample(CONCRETE, 3).map(function (c) { return { t: c, why: qt(c) + ' is something you can see or touch \u2014 that makes it concrete.' }; }),
        qt(a) + ' is an idea or quality you can\u2019t touch, so it is an abstract noun.');
    }
    var c = pick(CONCRETE);
    return mk('Which noun is a concrete noun?', c,
      sample(ABSTRACT, 3).map(function (a) { return { t: a, why: qt(a) + ' is an idea or quality \u2014 you can\u2019t see or touch it, so it is abstract.' }; }),
      qt(c) + ' is something you can see or touch, so it is a concrete noun.');
  }
  function collective() {
    var g = pick(GROUPS);
    return mk('Which noun is a collective noun (it names a group)?', g,
      sample(SINGLES, 3).map(function (s) { return { t: s, why: qt(s) + ' names just one thing, not a group.' }; }),
      qt(g) + ' names a group of people or things, so it is a collective noun.');
  }

  var PT = {
    personal:      'takes the place of a specific person or thing (I, you, he, they\u2026)',
    demonstrative: 'points out something (this, that, these, those)',
    reflexive:     'ends in -self or -selves and points back to the subject',
    indefinite:    'refers to people or things in a general way (everyone, nobody)',
    relative:      'starts a describing clause (who, whom, whose, which, that)',
    interrogative: 'starts a question (who, what, which)'
  };
  var PTITEMS = [
    ['personal', '[They] left early.'], ['personal', 'The teacher called [him].'], ['personal', 'Please sit by [us].'],
    ['personal', 'Mia gave the book to [me].'],
    ['demonstrative', '[Those] are the boots Jim bought.'], ['demonstrative', '[This] is my favorite song.'],
    ['demonstrative', '[These] are ripe.'], ['demonstrative', 'I like [that].'],
    ['reflexive', 'Rafael built the table [himself].'], ['reflexive', 'She taught [herself] to swim.'],
    ['reflexive', 'We made dinner [ourselves].'], ['reflexive', 'The kitten cleaned [itself].'],
    ['indefinite', '[Everyone] cheered.'], ['indefinite', '[Nobody] answered the door.'],
    ['indefinite', '[Someone] left a note.'], ['indefinite', '[Both] of my brothers play drums.'],
    ['relative', 'The poet [who] wrote it was young.'], ['relative', 'The book [that] I read was long.'],
    ['relative', 'She is the girl [whose] dog won.'], ['relative', 'The band [which] played last was loud.'],
    ['interrogative', '[Who] won the race?'], ['interrogative', '[What] is your name?'],
    ['interrogative', '[Which] is your coat?'], ['interrogative', '[Whom] did you call?']
  ];
  function pronType() {
    var it = pick(PTITEMS), type = it[0], w = words(it[1])[0];
    var wr = sample(Object.keys(PT).filter(function (k) { return k !== type; }), 3).map(function (k) {
      return { t: k, why: 'A ' + k + ' pronoun ' + PT[k] + '. That isn\u2019t how ' + qt(w) + ' works here.' };
    });
    return mk('What kind of pronoun is underlined?' + sentBox(br(it[1])), type, wr,
      qt(w) + ' is ' + an(type) + ' pronoun \u2014 it ' + PT[type] + '.');
  }

  /* ---------- verbs ---------- */
  var VK_ACTION = ['The cat [chased] the mouse.', 'Dad [cooked] dinner for us.', 'Birds [sing] in the morning.',
    'She [kicked] the ball over the fence.', 'The kids [laughed] at the joke.', 'We [painted] the garage on Saturday.',
    'A bus [stopped] outside the school.', 'The dog [barked] all night.', 'Luis [wrote] a long letter.'];
  var VK_LINK = ['The soup [tastes] delicious.', 'Mr. Hall [is] our coach.', 'The sky [became] dark.', 'He [seems] tired today.',
    'The pizza [smells] great.', 'The twins [are] happy.', 'You [look] nervous.', 'The water [stayed] cold.',
    'The night [grew] quiet.', 'Those flowers [are] beautiful.'];
  var VK_HELP = [['We [will] visit the museum.', 'visit'], ['She [has] finished her essay.', 'finished'],
    ['They [should] arrive soon.', 'arrive'], ['I [am] reading a good book.', 'reading'],
    ['The team [was] practicing hard.', 'practicing'], ['You [must] finish your homework.', 'finish'],
    ['We [have] been waiting for an hour.', 'waiting'], ['Maria [can] swim very fast.', 'swim']];
  var VKD = {
    'action verb':  'shows something someone or something does',
    'linking verb': 'connects the subject to a word that describes or renames it',
    'helping verb': 'comes before the main verb and helps it'
  };
  function verbKind() {
    var r = rnd(3), s, type, expl, w;
    if (r === 0) { s = pick(VK_ACTION); type = 'action verb'; w = words(s)[0]; expl = qt(w) + ' shows something that happens \u2014 an action verb.'; }
    else if (r === 1) { s = pick(VK_LINK); type = 'linking verb'; w = words(s)[0]; expl = qt(w) + ' connects the subject to a word that describes or renames it \u2014 a linking verb.'; }
    else { var h = pick(VK_HELP); s = h[0]; type = 'helping verb'; w = words(s)[0]; expl = qt(w) + ' helps the main verb ' + qt(h[1]) + ' \u2014 a helping verb.'; }
    var wr = Object.keys(VKD).filter(function (k) { return k !== type; }).map(function (k) {
      return { t: k, why: 'A ' + k + ' ' + VKD[k] + '. That isn\u2019t what ' + qt(w) + ' does here.' };
    });
    wr.push({ t: pick(['adverb', 'noun', 'adjective']), why: qt(w) + ' is a verb here, not a different part of speech.' });
    return mk('What kind of verb is underlined?' + sentBox(br(s)), type, wr, expl);
  }
  var TR = [['The cows [crossed] the pasture.', 'pasture'], ['Tyrone [tuned] his guitar.', 'guitar'], ['Maria [kicked] the ball.', 'ball'],
    ['The chef [cut] the onions.', 'onions'], ['Mom [packed] my lunch.', 'lunch'], ['He [opened] the window.', 'window'],
    ['Jess [washed] the car.', 'car'], ['The team [won] the game.', 'game']];
  var IN = ['The children [laughed].', 'A letter [came] from Norway.', 'The baby [slept] soundly.', 'Rain [fell] all night.',
    'Birds [flew] south.', 'We [arrived] late.', 'The bus [stopped] suddenly.', 'Mia [smiled] at me.'];
  function transitive() {
    var isT = Math.random() < 0.5, s, w, expl, right;
    if (isT) { var t = pick(TR); s = t[0]; w = words(s)[0]; right = 'transitive verb'; expl = qt(w) + ' has a direct object, ' + qt(t[1]) + ', that receives the action \u2014 so it is transitive.'; }
    else { s = pick(IN); w = words(s)[0]; right = 'intransitive verb'; expl = 'Nothing receives the action of ' + qt(w) + ', so it is intransitive.'; }
    var other = isT ? 'intransitive verb' : 'transitive verb';
    var wr = [
      { t: other, why: isT ? qt(w) + ' does have an object, so it is transitive.' : 'Nothing receives the action of ' + qt(w) + ', so it is not transitive.' },
      { t: 'linking verb', why: qt(w) + ' shows an action, so it isn\u2019t a linking verb.' },
      { t: 'helping verb', why: qt(w) + ' is the main verb here, not a helper.' }
    ];
    return mk('This action verb is underlined. Does it take an object?' + sentBox(br(s)), right, wr, expl);
  }

  /* ---------- prepositions, conjunctions, interjections ---------- */
  var CJ = {
    coordinating:  { d: 'joins words or groups that are used the same way (and, but, or, so, yet, for, nor)',
      s: ['The workshop has a bench saw [and] a sander.', 'Ticket sales were slow, [but] many people came.', 'You can have soup [or] salad.',
          'He studied hard, [so] he passed.', 'She was tired, [yet] she kept walking.', 'We stayed home, [for] it was raining.'] },
    subordinating: { d: 'starts a clause that depends on the main clause (because, when, although, if\u2026)',
      s: ['We stayed inside [because] it was raining.', '[Although] it was late, we kept playing.', 'Call me [when] you get home.',
          'I will wait [until] you arrive.', '[If] it rains, the game is canceled.', 'Stay here [while] I park the car.', 'Take a taxi [unless] the bus comes.'] },
    correlative:   { d: 'work as a pair (both\u2026and, either\u2026or, neither\u2026nor, not only\u2026but also)',
      s: ['[Both] moose [and] caribou live in the north.', 'You can [either] sing [or] dance.', '[Neither] Sam [nor] Pat was late.',
          'The movie was [not only] funny [but also] smart.'] }
  };
  function conjKind() {
    var type = pick(Object.keys(CJ)), s = pick(CJ[type].s), ws = words(s);
    var wr = Object.keys(CJ).filter(function (k) { return k !== type; }).map(function (k) {
      return { t: k + ' conjunction', why: 'A ' + k + ' conjunction ' + (k === 'correlative' ? 'works' : '') + (k === 'correlative' ? CJ[k].d.replace(/^work as/, ' as') : CJ[k].d) + '. That isn\u2019t how ' + qt(ws.join(' \u2026 ')) + ' works here.' };
    });
    wr.push({ t: 'preposition', why: 'A preposition starts a phrase with a noun or pronoun. These words join parts of the sentence.' });
    return mk('What kind of conjunction is underlined?' + sentBox(br(s)), type + ' conjunction', wr,
      ws.length > 1
        ? qt(ws.join(' \u2026 ')) + ' are correlative conjunctions \u2014 they ' + CJ[type].d + '.'
        : qt(ws[0]) + ' is ' + an(type) + ' conjunction \u2014 it ' + CJ[type].d + '.');
  }

  /* ---------- parts of the sentence ---------- */
  var SUBJ = [
    { s: 'A flock of birds flew over the pond.', subj: 'flock', v: 'flew', vq: 1, trap: ['birds', 'pond'], oth: [] },
    { s: 'The team of doctors worked hard to save the patient.', subj: 'team', v: 'worked', vq: 1, trap: ['doctors'], oth: ['patient', 'hard'] },
    { s: 'Yesterday we were walking by the new museum.', subj: 'we', v: 'were walking', vq: 1, trap: ['museum'], oth: ['Yesterday'] },
    { s: 'Angela bought large bags of birdseed at the supermarket.', subj: 'Angela', v: 'bought', vq: 1, trap: ['birdseed', 'supermarket'], oth: ['bags'] },
    { s: 'Our class will take a trip to the zoo.', subj: 'class', v: 'will take', vq: 1, trap: ['zoo'], oth: ['trip'] },
    { s: 'The students in the front row asked many questions.', subj: 'students', v: 'asked', vq: 1, trap: ['row'], oth: ['questions'] },
    { s: 'My brother plays drums in a band.', subj: 'brother', v: 'plays', vq: 1, trap: ['band'], oth: ['drums'] },
    { s: 'The tallest tree in the park fell during the storm.', subj: 'tree', v: 'fell', vq: 1, trap: ['park', 'storm'], oth: [] },
    { s: 'Piles of leaves covered the lawn.', subj: 'Piles', v: 'covered', vq: 1, trap: ['leaves'], oth: ['lawn'] },
    { s: 'The sound of the sirens woke the whole street.', subj: 'sound', v: 'woke', vq: 1, trap: ['sirens'], oth: ['street'] },
    { s: 'A pack of wolves howled at the moon.', subj: 'pack', v: 'howled', vq: 1, trap: ['wolves', 'moon'], oth: [] },
    { s: 'The bus driver stopped near the school.', subj: 'driver', v: 'stopped', vq: 1, trap: ['school'], oth: ['bus'] },
    { s: 'Is the cat sleeping on top of the desk?', subj: 'cat', v: 'Is sleeping', vq: 0, trap: ['desk', 'top'], oth: [] },
    { s: 'Were your friends early?', subj: 'friends', v: 'Were', vq: 0, trap: [], oth: ['early', 'your'] },
    { s: 'When was Carolyn elected president of the student council?', subj: 'Carolyn', v: 'was elected', vq: 0, trap: ['council'], oth: ['president', 'When'] }
  ];
  function simpleSubject() {
    var it = pick(SUBJ), seen = {}, tp, rest;
    seen[it.subj] = 1;
    tp = shuffle(it.trap).slice(0, 2).map(function (w) { return { t: w, why: qt(w) + ' is inside a prepositional phrase \u2014 a subject is never in one.' }; });
    rest = it.v.split(' ').map(function (w) { return { t: w, why: qt(w) + ' is part of the verb, not the subject.' }; })
      .concat(it.oth.map(function (w) { return { t: w, why: qt(w) + ' isn\u2019t who or what the sentence is about.' }; }));
    var wr = [];
    tp.concat(shuffle(rest)).forEach(function (o) { if (!seen[o.t] && wr.length < 3) { seen[o.t] = 1; wr.push(o); } });
    return mk('What is the simple subject of this sentence?' + sentBox(it.s), it.subj, wr,
      'Ask \u201CWho or what ' + it.v.toLowerCase() + '?\u201D \u2014 the answer is ' + qt(it.subj) + '.');
  }
  function simpleVerb() {
    var pool = SUBJ.filter(function (i) { return i.vq; }), it = pick(pool), vw = it.v.split(' '), wr;
    if (vw.length > 1) {
      wr = [{ t: it.subj, why: qt(it.subj) + ' is the subject \u2014 it does the action.' },
            { t: vw[vw.length - 1], why: 'Include the helping verb too: ' + qt(it.v) + '.' },
            { t: vw[0], why: 'The main verb belongs to the phrase too: ' + qt(it.v) + '.' },
            { t: it.trap[0], why: qt(it.trap[0]) + ' is a noun, not a verb.' }];
    } else {
      var extra = it.oth[0] || it.trap[1] || it.trap[0];
      wr = [{ t: it.subj, why: qt(it.subj) + ' is the subject \u2014 it does the action.' },
            { t: it.trap[0], why: qt(it.trap[0]) + ' is a noun, not a verb.' },
            { t: extra, why: qt(extra) + ' is a noun or modifier, not the verb.' }];
    }
    return mk('What is the verb (or verb phrase) in this sentence?' + sentBox(it.s), it.v, wr,
      qt(it.v) + ' tells what the subject ' + qt(it.subj) + ' does.');
  }
  var IMP = [
    ['Close the front door.', 'door', 'Close', 'front'], ['Please read me the directions.', 'directions', 'read', 'me'],
    ['Eat a balanced meal for good health.', 'meal', 'Eat', 'health'], ['Turn off the lights.', 'lights', 'Turn', 'off'],
    ['Wash your hands before lunch.', 'hands', 'Wash', 'lunch'], ['Hand me that pencil.', 'pencil', 'Hand', 'me'],
    ['Take out the trash tonight.', 'trash', 'Take', 'tonight'], ['Stop at the corner.', 'corner', 'Stop', 'at']
  ];
  function understoodYou() {
    var it = pick(IMP);
    return mk('This sentence is a command. Who is the subject?' + sentBox(it[0]), 'you (understood)', [
      { t: it[1], why: qt(it[1]) + ' receives the action \u2014 it isn\u2019t the subject.' },
      { t: it[2], why: qt(it[2]) + ' is the verb \u2014 the action you are told to do.' },
      { t: it[3], why: qt(it[3]) + ' doesn\u2019t tell who is being told to act.' }
    ], 'In a command, the subject is \u201Cyou\u201D even though the word isn\u2019t written.');
  }
  var COMPS = [
    ['both', 'Leon and Cesar buttered and toasted their bread.'], ['both', 'My aunt and uncle cooked and served dinner.'],
    ['both', 'Mina and Sara swam and dove all afternoon.'],
    ['subject', 'Jamal, Terry, and Wanda raced to the finish line.'], ['subject', 'The cat and the dog slept on the couch.'],
    ['subject', 'Pizza and tacos were on the menu.'], ['subject', 'Ana and Ben lost their keys.'],
    ['verb', 'Vince reads or plays basketball.'], ['verb', 'The dog barked and ran down the street.'],
    ['verb', 'Marcus washed and dried the dishes.'], ['verb', 'We laughed and cheered at the game.'],
    ['neither', 'The dog barked at the mailman.'], ['neither', 'My sister baked a cake.'],
    ['neither', 'The bus stopped at the corner.'], ['neither', 'Lucas studied for the exam.']
  ];
  var COMPTXT = { both: 'both (subject and verb)', subject: 'a compound subject', verb: 'a compound verb', neither: 'neither' };
  var COMPWHY = {
    both: 'It has two subjects joined by a conjunction and two verbs joined by a conjunction.',
    subject: 'It has two or more subjects joined by a conjunction, but only one verb.',
    verb: 'It has one subject with two or more verbs joined by a conjunction.',
    neither: 'It has just one subject and one verb \u2014 nothing is joined by and or or.'
  };
  function compound() {
    var it = pick(COMPS), kind = it[0], right = COMPTXT[kind];
    var wr = Object.keys(COMPTXT).filter(function (k) { return k !== kind; }).map(function (k) {
      return { t: COMPTXT[k], why: k === 'both' ? 'It doesn\u2019t have both a compound subject and a compound verb.'
        : k === 'neither' ? 'Look again \u2014 something in this sentence is joined by a conjunction.'
        : 'It doesn\u2019t have ' + COMPTXT[k] + '.' };
    });
    return mk('What does this sentence have?' + sentBox(it[1]), right, wr, COMPWHY[kind]);
  }
  var HERE = [
    ['There are four suitcases by the door.', 'suitcases', 'There', 'are', 'door'], ['Here is your new video game.', 'game', 'Here', 'is', 'new'],
    ['There is a spider on the wall.', 'spider', 'There', 'is', 'wall'], ['Here are your tickets for the show.', 'tickets', 'Here', 'are', 'show'],
    ['There were two reasons for the delay.', 'reasons', 'There', 'were', 'delay'], ['There is a rainbow over the lake.', 'rainbow', 'There', 'is', 'lake']
  ];
  function hereThere() {
    var it = pick(HERE);
    return mk('What is the subject of this sentence?' + sentBox(it[0]), it[1], [
      { t: it[2], why: qt(it[2]) + ' is never the subject \u2014 it only tells where.' },
      { t: it[3], why: qt(it[3]) + ' is the verb, not the subject.' },
      { t: it[4], why: qt(it[4]) + ' isn\u2019t what the sentence is about.' }
    ], 'Ask \u201CWhat ' + it[3] + ' ' + it[2].toLowerCase() + '?\u201D \u2014 ' + qt(it[1]) + '. Here and there are never the subject.');
  }

  var ROLE = {
    'direct object': 'answers \u201Cwhat?\u201D or \u201Cwhom?\u201D after an action verb',
    'indirect object': 'comes between the verb and the direct object and tells to or for whom',
    'objective complement': 'follows the direct object and renames or describes it',
    'object of a preposition': 'ends a phrase that starts with a preposition (to, with, beside\u2026)'
  };
  var OBJ = [
    ['direct object', 'Ms. Campbell recited the [poem] from memory.', 'Recited what? The poem.'],
    ['direct object', 'Angelina met [Susan] at the library.', 'Met whom? Susan.'],
    ['direct object', 'Lorenzo collected aluminum [cans] for recycling.', 'Collected what? Cans.'],
    ['direct object', 'Jose threw the [ball] to his sister.', 'Threw what? The ball.'],
    ['direct object', 'The driver holds an excellent safety [record].', 'Holds what? The record.'],
    ['direct object', 'Maria baked [cookies] for the party.', 'Baked what? Cookies.'],
    ['indirect object', 'Mr. Jacobs showed our [class] slides of the paintings.', 'Showed to whom? The class. (Direct object: slides.)'],
    ['indirect object', 'Pedro gave the [shelter] his extra sweaters.', 'Gave to what? The shelter. (Direct object: sweaters.)'],
    ['indirect object', 'Aunt Sarah brought [me] a gift from her trip.', 'Brought to whom? Me. (Direct object: gift.)'],
    ['indirect object', 'The coach handed the [team] new jerseys.', 'Handed to whom? The team. (Direct object: jerseys.)'],
    ['indirect object', 'Brandon served the [guests] fresh sea bass.', 'Served to whom? The guests. (Direct object: sea bass.)'],
    ['indirect object', 'Mrs. Duffy fed her [roses] the new plant food.', 'Fed to what? The roses. (Direct object: plant food.)'],
    ['objective complement', 'The students elected Veronica [treasurer].', 'It renames the direct object, Veronica.'],
    ['objective complement', 'Ben painted the kitchen walls [blue].', 'It describes the direct object, walls.'],
    ['objective complement', 'They named their puppy [Max].', 'It renames the direct object, puppy.'],
    ['objective complement', 'Herb swept the sidewalk [clean].', 'It describes the direct object, sidewalk.'],
    ['objective complement', 'Tom\u00E1s cut the puzzle pieces [smaller].', 'It describes the direct object, pieces.'],
    ['objective complement', 'The judge found the jury\u2019s decision [surprising].', 'It describes the direct object, decision.'],
    ['object of a preposition', 'We drove through the [park] to see the skaters.', 'It follows the preposition through.'],
    ['object of a preposition', 'Pedro walked to the [store].', 'It follows the preposition to.'],
    ['object of a preposition', 'She sat beside her [friend].', 'It follows the preposition beside.'],
    ['object of a preposition', 'Janet plays with the [band].', 'It follows the preposition with.'],
    ['object of a preposition', 'The shutters flew open during the [storm].', 'It follows the preposition during.']
  ];
  function objectRole() {
    var it = pick(OBJ), role = it[0], w = words(it[1])[0];
    var wr = Object.keys(ROLE).filter(function (k) { return k !== role; }).map(function (k) {
      return { t: k, why: 'A ' + k + ' ' + ROLE[k] + '. That isn\u2019t the job of ' + qt(w) + ' here.' };
    });
    return mk('What job does the underlined word do?' + sentBox(br(it[1])), role, wr,
      qt(w) + ' is ' + an(role) + '. ' + it[2]);
  }

  var SC = [
    ['noun', 'The new winner was Luis.', 'winner', 'was', 'Luis', 'new'], ['noun', 'That tall tree is an oak.', 'tree', 'is', 'oak', 'tall'],
    ['noun', 'Dad became our coach.', 'Dad', 'became', 'coach', 'our'], ['noun', 'My aunt is a firefighter.', 'aunt', 'is', 'firefighter', 'My'],
    ['noun', 'Spring is the season of renewal.', 'Spring', 'is', 'season', 'renewal'],
    ['noun', 'Maria was the captain of the team.', 'Maria', 'was', 'captain', 'team'],
    ['noun', 'Her brother remained a loyal friend.', 'brother', 'remained', 'friend', 'loyal'],
    ['adj', 'The autumn sky is blustery.', 'sky', 'is', 'blustery', 'autumn'], ['adj', 'The hot soup tastes delicious.', 'soup', 'tastes', 'delicious', 'hot'],
    ['adj', 'From my window, the trees look bare.', 'trees', 'look', 'bare', 'window'], ['adj', 'Our weather was cold.', 'weather', 'was', 'cold', 'Our'],
    ['adj', 'The honking geese sounded lonely.', 'geese', 'sounded', 'lonely', 'honking'], ['adj', 'The children seem tired today.', 'children', 'seem', 'tired', 'today'],
    ['adj', 'The winter night grew dark.', 'night', 'grew', 'dark', 'winter'], ['adj', 'Fresh bee balm smells spicy.', 'balm', 'smells', 'spicy', 'Fresh']
  ];
  // SC rows: [kind, sentence, subject, linking verb, complement, other word]
  function subjComp() {
    var it = pick(SC), kind = it[0], w = it[4], lv = it[3], subj = it[2];
    var right = kind === 'noun' ? 'predicate nominative' : 'predicate adjective';
    var wr = [
      { t: kind === 'noun' ? 'predicate adjective' : 'predicate nominative',
        why: kind === 'noun' ? qt(w) + ' is a noun, not an adjective.' : qt(w) + ' is an adjective, not a noun.' },
      { t: 'direct object', why: qt(lv) + ' is a linking verb, so what follows it is not a direct object.' },
      { t: 'object of a preposition', why: qt(w) + ' doesn\u2019t follow a preposition.' }
    ];
    return mk('What is the underlined word?' + sentBox(it[1].replace(w, U(w))), right, wr,
      qt(w) + ' follows the linking verb ' + qt(lv) + ' and ' + (kind === 'noun' ? 'renames' : 'describes') + ' the subject ' + qt(subj) + '.');
  }
  function linkingVerb() {
    var it = pick(SC);
    return mk('Which word is the linking verb?' + sentBox(it[1]), it[3], [
      { t: it[2], why: qt(it[2]) + ' is the subject \u2014 the verb connects it to ' + qt(it[4]) + '.' },
      { t: it[4], why: qt(it[4]) + ' is the complement \u2014 it comes after the linking verb.' },
      { t: it[5], why: qt(it[5]) + ' isn\u2019t a verb.' }
    ], qt(it[3]) + ' connects the subject ' + qt(it[2]) + ' to ' + qt(it[4]) + '.');
  }

  var ST = {
    declarative:   'makes a statement and ends with a period',
    interrogative: 'asks a question and ends with a question mark',
    imperative:    'gives a command or makes a request',
    exclamatory:   'shows strong feeling and ends with an exclamation point'
  };
  var STITEMS = {
    declarative: ['Mount Rushmore is in South Dakota.', 'My friends will be arriving soon.', 'The front tires on the car are flat.',
      'Dogs can be loyal companions.', 'The raspberry bushes produced many berries this year.', 'Tamisha wants to be a photographer.',
      'We cleaned the house before leaving for the movie.', 'Fruits and vegetables are good for you.'],
    interrogative: ['Have you finished your writing assignment?', 'Is Boston the capital of Massachusetts?', 'What is your favorite movie?',
      'Why wasn\u2019t Marlene in school today?', 'How long is that scarf?', 'When did you publish your first story?',
      'Is there a job opening for a cashier on weekends?', 'What did you eat for breakfast?'],
    imperative: ['Please open the door for me.', 'Please call Phoebe after school.', 'Write your answers on a separate piece of paper.',
      'Please lend me your copy of the book.', 'Turn in your homework before class.', 'Take out a pencil and a sheet of paper.',
      'Please give Jeremy the message.'],
    exclamatory: ['What a motivating speech she gave!', 'What an inspired leader she is!', 'What a wonderful birthday that was!',
      'What an important scientific breakthrough this is!', 'Oh, you were hired for the job!', 'Wow, that was the best game ever!',
      'Oh no, you\u2019ve ruined the experiment!', 'How tall that building is!']
  };
  function sentType() {
    var type = pick(Object.keys(ST)), s = pick(STITEMS[type]);
    var wr = Object.keys(ST).filter(function (k) { return k !== type; }).map(function (k) {
      return { t: k, why: 'A ' + k + ' sentence ' + ST[k] + '. This one doesn\u2019t.' };
    });
    return mk('What kind of sentence is this?' + sentBox(s), type, wr, 'This sentence ' + ST[type] + ' \u2014 it is ' + type + '.');
  }
  var ENDM = { declarative: 'a period', interrogative: 'a question mark', imperative: 'a period', exclamatory: 'an exclamation point' };
  function endMark() {
    var type = pick(Object.keys(ST)), s = pick(STITEMS[type]), right = ENDM[type], body = s.slice(0, -1);
    var all = ['a period', 'a question mark', 'an exclamation point', 'a comma'];
    var why = {
      'a period': 'A period ends a statement or a mild command.',
      'a question mark': 'A question mark ends a question.',
      'an exclamation point': 'An exclamation point ends a sentence that shows strong feeling.',
      'a comma': 'A comma doesn\u2019t end a sentence.'
    };
    var wr = all.filter(function (a) { return a !== right; }).map(function (a) { return { t: a, why: why[a] }; });
    return mk('Which end mark belongs at the end of this sentence?' + sentBox(body + '<span class="tgt">&nbsp;&nbsp;</span>'), right, wr,
      'This is ' + an(type) + ' sentence, so it ends with ' + right + '.');
  }

  /* ---------- the skill list ---------- */
  function rotate(list) { return function () { for (var i = 0; i < 6; i++) { var q = pick(list)(); if (q) return q; } return null; }; }
  var SETS = [
    { id: 'pos', name: 'Parts of Speech', topics: [
      { id: 'np',  name: 'Nouns & pronouns', gen: rotate([function () { return whichWord(['n', 'pron']); }, function () { return posName(['n', 'pron']); },
        commonProper, concreteAbstract, collective, pronType, pronType]) },
      { id: 'av',  name: 'Adjectives & adverbs', gen: rotate([function () { return whichWord(['adj', 'adv']); }, function () { return posName(['adj', 'adv']); },
        function () { return describe(['adj', 'adv']); }, function () { return describe(['adj', 'adv']); }, advTells, advTells]) },
      { id: 'vb',  name: 'Verbs', gen: rotate([function () { return whichWord(['v']); }, function () { return posName(['v']); },
        verbKind, verbKind, transitive, transitive]) },
      { id: 'pcj', name: 'Prepositions, conjunctions & interjections', gen: rotate([function () { return whichWord(['prep', 'conj', 'intj']); },
        function () { return posName(['prep', 'conj', 'intj']); }, function () { return describe(['prep']); }, function () { return describe(['prep']); }, conjKind, conjKind]) }
    ] },
    { id: 'sent', name: 'Parts of the Sentence', topics: [
      { id: 'subj', name: 'Subjects & verbs', gen: rotate([simpleSubject, simpleSubject, simpleVerb, understoodYou, compound, hereThere]) },
      { id: 'obj',  name: 'Objects & complements', gen: rotate([objectRole]) },
      { id: 'subc', name: 'Subject complements', gen: rotate([subjComp, subjComp, linkingVerb]) },
      { id: 'type', name: 'Sentence types', gen: rotate([sentType, sentType, endMark]) }
    ] }
  ];

  /* ---------- public API ---------- */
  function make(setIdx, topicIdxs) {
    var set = SETS[setIdx];
    var tl = (topicIdxs && topicIdxs.length) ? topicIdxs.slice() : set.topics.map(function (_, i) { return i; });
    var recent = [];
    function next() {
      for (var tries = 0; tries < 80; tries++) {
        var ti = pick(tl), topic = set.topics[ti], q = null;
        try { q = topic.gen(); } catch (e) { q = null; }
        if (valid(q) && recent.indexOf(q.prompt) < 0) {
          q.topic = topic.name; q.topicIndex = ti;
          recent.push(q.prompt); if (recent.length > 14) recent.shift();
          return q;
        }
      }
      throw new Error('SpitzQ: could not build a question');
    }
    function short(n) {
      for (var i = 0; i < 40; i++) {
        var q = next();
        if (q.choices.every(function (c) { return c.html.length <= n; })) return q;
      }
      return next();
    }
    return { next: next, short: short, set: set, setIndex: setIdx, topics: tl };
  }
  /* ---------- teacher settings (settings.js sets SV_SETTINGS; absent = everything open) ---------- */
  function cfg() { return (typeof SV_SETTINGS !== 'undefined' && SV_SETTINGS) ? SV_SETTINGS : {}; }
  function setIdxById(id) { for (var i = 0; i < SETS.length; i++) if (SETS[i].id === id) return i; return -1; }
  function topicIdxs(si, ids) {
    var out = [];
    (ids || []).forEach(function (id) { SETS[si].topics.forEach(function (t, k) { if (t.id === id && out.indexOf(k) < 0) out.push(k); }); });
    return out;
  }
  function allTopics(si) { return SETS[si].topics.map(function (_, k) { return k; }); }
  function entries(list) { // [{id, topics?}] -> [{index, id, topics:[idx]}]
    var out = [];
    (list || []).forEach(function (e) {
      var si = setIdxById(e && e.id); if (si < 0) return;
      var tl = (e.topics && e.topics.length) ? topicIdxs(si, e.topics) : allTopics(si);
      if (tl.length) out.push({ index: si, id: e.id, topics: tl });
    });
    return out;
  }
  // Which skills may students pick right now?  Assigned list wins; otherwise everything not hidden.
  function allowed() {
    var c = cfg(), as = entries(c.assign);
    if (as.length) return as;
    var out = [], hide = c.hide || [];
    SETS.forEach(function (s, i) { if (hide.indexOf(s.id) < 0) out.push({ index: i, id: s.id, topics: allTopics(i) }); });
    if (!out.length) { var fb = setIdxById(c.fallback); if (fb < 0) fb = 0; out.push({ index: fb, id: SETS[fb].id, topics: allTopics(fb) }); }
    return out;
  }
  // Suggested skills, limited to ones students can actually pick.
  function suggested() {
    var al = allowed(), out = [];
    entries(cfg().suggest).forEach(function (e) {
      al.forEach(function (a) {
        if (a.index !== e.index) return;
        var tl = e.topics.filter(function (k) { return a.topics.indexOf(k) >= 0; });
        if (tl.length) out.push({ index: e.index, id: e.id, topics: tl });
      });
    });
    return out;
  }
  // Score multiplier for a run on a suggested skill (every topic played must be a suggested one).
  function bonus(setIdx, topicIdxList) {
    var pct = cfg().bonus; if (pct == null) pct = 25;
    if (!(pct > 0)) return 1;
    var tl = (topicIdxList && topicIdxList.length) ? topicIdxList : allTopics(setIdx), hit = false;
    suggested().forEach(function (e) {
      if (e.index === setIdx && tl.every(function (k) { return e.topics.indexOf(k) >= 0; })) hit = true;
    });
    return hit ? 1 + pct / 100 : 1;
  }
  // Reads ?set=pos&topics=np,av (or #pos) from the link. Returns null if no set is named.
  // The teacher's assign/hide lock is applied here, so old bookmarks follow it too.
  function forGame(prefix) {
    var qs = {}, loc = (typeof location !== 'undefined') ? location : { search: '', hash: '' };
    (loc.search || '').replace(/^\?/, '').split('&').forEach(function (p) { if (p) { var kv = p.split('='); qs[kv[0]] = decodeURIComponent(kv[1] || ''); } });
    var sid = qs.set || (loc.hash || '').replace(/^#/, '');
    var si = setIdxById(sid);
    if (si < 0) return null;
    var al = allowed(), hit = null, i;
    for (i = 0; i < al.length; i++) if (al[i].index === si) hit = al[i];
    var ts = [], changed = false;
    if (!hit) { hit = al[0]; si = hit.index; ts = hit.topics.slice(); changed = true; }
    else {
      topicIdxs(si, (qs.topics || '').split(',')).forEach(function (k) { if (hit.topics.indexOf(k) >= 0) ts.push(k); });
      if (!ts.length) ts = hit.topics.slice();
    }
    if (changed && typeof history !== 'undefined' && history.replaceState) {
      try { history.replaceState(null, '', '?set=' + SETS[si].id + '&topics=' + ts.map(function (k) { return SETS[si].topics[k].id; }).join(',')); } catch (e) {}
    }
    var g = make(si, ts); g.redirected = changed; return g;
  }
  function meta() {
    return SETS.map(function (s) { return { id: s.id, name: s.name, topics: s.topics.map(function (t) { return { id: t.id, name: t.name }; }) }; });
  }
  return { make: make, forGame: forGame, meta: meta, valid: valid, SETS: SETS, cfg: cfg, allowed: allowed, suggested: suggested, bonus: bonus };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SpitzQ;

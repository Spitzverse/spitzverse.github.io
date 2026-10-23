/* SpitzVerse teacher settings. The teacher page (teacher.html) writes this file for you:
   open it, set things up, press "Download settings.js", then upload it to GitHub to replace this one. */
var SV_SETTINGS = {
  assign: [],      // lock students to these skills, e.g. [{id:'sent', topics:['subj']}]. Empty = no lock.
  suggest: [],     // skills to promote with a score bonus, same shape as assign
  note: '',        // a short message under the suggested banner
  bonus: 25,       // % bonus for playing a suggested skill
  hide: [],        // skills students cannot pick right now, e.g. ['pos']
  fallback: 'pos', // skill to use if everything is hidden
  unlock: {},      // game release overrides, e.g. {last_bell:'2026-11-02T08:00', gremlin_blaster:'now', x:'hidden'}
  formUrl: 'https://forms.gle/cnvWMh2S1zuoBXVs7'      // your Google Form link for score codes
};

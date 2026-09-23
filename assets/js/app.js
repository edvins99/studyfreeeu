/* StudyFreeEU — client enhancements (progressive: all listings are pre-rendered) */
(function () {
  'use strict';

  var store = {
    get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- mobile nav ---------- */
  function initNav() {
    var t = document.querySelector('.nav-toggle'), n = document.querySelector('.nav');
    if (t && n) t.addEventListener('click', function () { n.classList.toggle('open'); });
  }

  /* ---------- home search ---------- */
  function initHeroSearch() {
    var inp = document.getElementById('hero-search'), btn = document.getElementById('hero-search-btn');
    if (!inp) return;
    var prefix = inp.getAttribute('data-prefix') || '';
    function go() {
      var q = encodeURIComponent(inp.value.trim());
      window.location.href = prefix + 'universities/index.html' + (q ? '?q=' + q : '');
    }
    if (btn) btn.addEventListener('click', go);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  }

  /* ---------- favorites ---------- */
  function initFavorites() {
    var favs = store.get('sfe_fav', []);
    function render() {
      document.querySelectorAll('.js-fav').forEach(function (b) {
        var on = favs.indexOf(b.getAttribute('data-id')) !== -1;
        b.classList.toggle('is-on', on);
        b.textContent = on ? '★ Saved' : '☆ Save';
      });
      var c = document.getElementById('fav-count');
      if (c) c.textContent = favs.length;
    }
    document.querySelectorAll('.js-fav').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var id = b.getAttribute('data-id'), i = favs.indexOf(id);
        if (i === -1) favs.push(id); else favs.splice(i, 1);
        store.set('sfe_fav', favs); render();
      });
    });
    render();
  }

  /* ---------- compare ---------- */
  function getCompare() { return store.get('sfe_compare', []); }
  function renderCompareBar() {
    var bar = document.getElementById('compare-bar');
    if (!bar) return;
    var ids = getCompare();
    var chips = bar.querySelector('.compare-chips');
    chips.innerHTML = '';
    ids.forEach(function (item) {
      var span = document.createElement('span');
      span.className = 'chip';
      span.innerHTML = '<span></span><button type="button" aria-label="Remove">×</button>';
      span.querySelector('span').textContent = item.name;
      span.querySelector('button').addEventListener('click', function () {
        var a = getCompare().filter(function (x) { return x.id !== item.id; });
        store.set('sfe_compare', a); syncCompareButtons(); renderCompareBar();
      });
      chips.appendChild(span);
    });
    bar.classList.toggle('show', ids.length > 0);
    var go = bar.querySelector('.js-compare-go');
    if (go) go.disabled = ids.length < 2;
  }
  function syncCompareButtons() {
    var ids = getCompare().map(function (x) { return x.id; });
    document.querySelectorAll('.js-compare').forEach(function (b) {
      var on = ids.indexOf(b.getAttribute('data-id')) !== -1;
      b.classList.toggle('is-on', on);
      b.textContent = on ? '✓ In compare' : '⇄ Compare';
    });
  }
  function initCompare() {
    document.querySelectorAll('.js-compare').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var id = b.getAttribute('data-id'), name = b.getAttribute('data-name');
        var ids = getCompare();
        var i = ids.findIndex(function (x) { return x.id === id; });
        if (i !== -1) ids.splice(i, 1);
        else {
          if (ids.length >= 4) { alert('You can compare up to 4 universities.'); return; }
          ids.push({ id: id, name: name });
        }
        store.set('sfe_compare', ids);
        syncCompareButtons(); renderCompareBar();
      });
    });
    var clear = document.querySelector('.js-compare-clear');
    if (clear) clear.addEventListener('click', function () {
      store.set('sfe_compare', []); syncCompareButtons(); renderCompareBar();
    });
    syncCompareButtons(); renderCompareBar();
  }

  /* ---------- universities listing filters ---------- */
  function initListing() {
    var results = document.getElementById('results');
    if (!results) return;
    var cards = Array.prototype.slice.call(results.querySelectorAll('.uni-card'));
    var pageSize = 12, page = 1;

    var $ = function (id) { return document.getElementById(id); };
    var params = new URLSearchParams(location.search);
    if (params.get('q')) { var s = $('f-search'); if (s) s.value = params.get('q'); }
    var pre = { country: params.get('country'), level: params.get('level'), status: params.get('status'), field: params.get('field') };
    Object.keys(pre).forEach(function (k) { if (pre[k] != null && $('f-' + k)) $('f-' + k).value = pre[k]; });
    if (params.get('eng') && $('f-english')) $('f-english').checked = true;
    if (params.get('maxcost') && $('f-maxcost')) $('f-maxcost').value = params.get('maxcost');

    function matches(c) {
      var q = ($('f-search') && $('f-search').value || '').trim().toLowerCase();
      var country = $('f-country') && $('f-country').value || '';
      var level = $('f-level') && $('f-level').value || '';
      var status = $('f-status') && $('f-status').value || '';
      var field = $('f-field') && $('f-field').value || '';
      var engOnly = $('f-english') && $('f-english').checked;
      var maxCost = $('f-maxcost') && $('f-maxcost').value;

      var d = c.dataset;
      if (q && d.name.indexOf(q) === -1 && d.city.indexOf(q) === -1) return false;
      if (country && d.country !== country) return false;
      if (level && d.levels.indexOf(level) === -1) return false;
      if (status && d.status !== status) return false;
      if (field && d.fields.indexOf(field) === -1) return false;
      if (engOnly && d.english !== '1') return false;
      if (maxCost !== '' && maxCost != null) {
        var cost = d.cost === '' ? Infinity : Number(d.cost);
        if (cost > Number(maxCost)) return false;
      }
      return true;
    }

    function sortCards(list) {
      var sort = $('sort') && $('sort').value || 'name';
      return list.sort(function (a, b) {
        if (sort === 'cost-asc' || sort === 'cost-desc') {
          var ca = a.dataset.cost === '' ? Infinity : Number(a.dataset.cost);
          var cb = b.dataset.cost === '' ? Infinity : Number(b.dataset.cost);
          return sort === 'cost-asc' ? ca - cb : cb - ca;
        }
        if (sort === 'country') return a.dataset.country.localeCompare(b.dataset.country) || a.dataset.name.localeCompare(b.dataset.name);
        return a.dataset.name.localeCompare(b.dataset.name);
      });
    }

    function render() {
      var list = sortCards(cards.filter(matches));
      cards.forEach(function (c) { c.classList.add('hidden'); });
      var start = (page - 1) * pageSize;
      list.slice(start, start + pageSize).forEach(function (c) { c.classList.remove('hidden'); });

      var count = document.getElementById('result-count');
      if (count) count.textContent = list.length + ' universit' + (list.length === 1 ? 'y' : 'ies') + ' found';

      var pag = document.querySelector('.pagination');
      if (pag) {
        pag.innerHTML = '';
        var pages = Math.max(1, Math.ceil(list.length / pageSize));
        if (page > pages) page = pages;
        if (pages > 1) {
          for (var i = 1; i <= pages; i++) {
            (function (i) {
              var b = document.createElement('button');
              b.textContent = i; if (i === page) b.classList.add('active');
              b.addEventListener('click', function () { page = i; render(); window.scrollTo({ top: results.offsetTop - 80, behavior: 'smooth' }); });
              pag.appendChild(b);
            })(i);
          }
        }
      }
      var empty = document.getElementById('empty');
      if (empty) empty.classList.toggle('hidden', list.length !== 0);
    }

    ['f-search', 'f-country', 'f-level', 'f-status', 'f-field', 'f-english', 'f-maxcost', 'sort'].forEach(function (id) {
      var el = $(id); if (!el) return;
      var ev = (el.type === 'text' || el.type === 'search' || el.type === 'number') ? 'input' : 'change';
      el.addEventListener(ev, function () { page = 1; render(); });
    });
    var reset = document.getElementById('f-reset');
    if (reset) reset.addEventListener('click', function () {
      ['f-search', 'f-country', 'f-level', 'f-status', 'f-field', 'f-maxcost'].forEach(function (id) { var e = $(id); if (e) e.value = ''; });
      var e = $('f-english'); if (e) e.checked = false;
      page = 1; render();
    });

    render();
  }

  /* ---------- compare page ---------- */
  function initComparePage() {
    var wrap = document.getElementById('compare-table');
    if (!wrap) return;
    var data = window.SFE_UNIVERSITIES || [];
    var ids = getCompare().map(function (x) { return x.id; });
    if (ids.length < 2) {
      wrap.innerHTML = '<div class="empty">Select at least two universities (use the “Compare” button on the <a href="../universities/index.html">universities</a> page) to see them side by side here.</div>';
      return;
    }
    var cols = ids.map(function (id) { return data.find(function (u) { return u.id === id; }); }).filter(Boolean);
    var rows = [
      ['Country', function (u) { return u.country; }],
      ['City', function (u) { return u.city; }],
      ['Type', function (u) { return u.type; }],
      ['EU tuition status', function (u) { return u.tuition_status; }],
      ['EU tuition', function (u) { return u.tuition_eu; }],
      ['Mandatory fees', function (u) { return u.mandatory_semester_fee || 'Not yet verified'; }],
      ['Est. mandatory cost / year', function (u) { return u.est_annual_mandatory_cost_eur != null ? '€' + u.est_annual_mandatory_cost_eur : 'Not yet verified'; }],
      ['Degree levels', function (u) { return [u.bachelor_available ? 'Bachelor' : null, u.master_available ? 'Master' : null, u.phd_available ? 'PhD' : null].filter(Boolean).join(', '); }],
      ['English-taught programmes', function (u) { return [u.english_bachelor ? 'Bachelor' : null, u.english_master ? 'Master' : null, u.english_phd ? 'PhD' : null].filter(Boolean).join(', ') || 'Not yet verified'; }],
      ['Admission requirements', function (u) { return u.admission_requirements; }],
      ['Admissions contact', function (u) { return (u.contact && (u.contact.email || u.contact.phone)) ? [u.contact.email, u.contact.phone].filter(Boolean).join(' · ') : 'See university page'; }],
      ['Application deadline', function (u) { return (u.deadlines && u.deadlines.closes) || 'Not yet verified'; }],
      ['Documents to submit', function (u) { return (u.deadlines && u.deadlines.documents) || 'Not yet verified'; }],
      ['Last verified', function (u) { return u.last_verified || 'Not yet verified'; }]
    ];
    var html = '<div class="table-wrap"><table><thead><tr><th>Field</th>' +
      cols.map(function (u) { return '<th><a href="../universities/' + u.slug + '/index.html">' + u.name + '</a></th>'; }).join('') +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr><th>' + r[0] + '</th>' + cols.map(function (u) { return '<td>' + (r[1](u) || '—') + '</td>'; }).join('') + '</tr>';
    });
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
  }

  /* ---------- admin console ---------- */
  function initAdmin() {
    var root = document.getElementById('admin-root');
    if (!root) return;
    var state = { countries: [], universities: [], programs: [], tab: 'universities', dirty: false };

    function daysAgo(d) { if (!d) return Infinity; return Math.round((Date.now() - new Date(d).getTime()) / 86400000); }
    function stalenessClass(d) {
      var a = daysAgo(d);
      if (a >= 365) return 'stale-12';
      if (a >= 180) return 'stale-6';
      return '';
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

    function render() {
      var tab = state.tab;
      var list = state[tab] || [];
      var head, rows;
      if (tab === 'universities') {
        head = ['Name', 'Country', 'City', 'Tuition status', 'Est. cost (€/yr)', 'Verification', 'Last verified'];
        rows = list.map(function (u, i) {
          return '<tr class="' + stalenessClass(u.last_verified) + '">' +
            '<td><input data-t="' + tab + '" data-i="' + i + '" data-f="name" value="' + esc(u.name) + '"></td>' +
            '<td>' + esc(u.country_code) + '</td>' +
            '<td><input data-t="' + tab + '" data-i="' + i + '" data-f="city" value="' + esc(u.city) + '"></td>' +
            '<td><select data-t="' + tab + '" data-i="' + i + '" data-f="tuition_status">' +
            ['Tuition-Free', 'Tuition-Free + Mandatory Fees', 'Conditional Tuition-Free', 'Low Tuition', 'Paid', 'Unknown / Needs Verification']
              .map(function (s) { return '<option' + (s === u.tuition_status ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
            '</select></td>' +
            '<td><input type="number" data-t="' + tab + '" data-i="' + i + '" data-f="est_annual_mandatory_cost_eur" value="' + (u.est_annual_mandatory_cost_eur == null ? '' : u.est_annual_mandatory_cost_eur) + '"></td>' +
            '<td><input data-t="' + tab + '" data-i="' + i + '" data-f="verification_status" value="' + esc(u.verification_status) + '"></td>' +
            '<td><input type="date" data-t="' + tab + '" data-i="' + i + '" data-f="last_verified" value="' + esc(u.last_verified) + '"></td></tr>';
        });
      } else if (tab === 'programs') {
        head = ['Program', 'University', 'Level', 'Language', 'Tuition status', 'Verification', 'Last verified'];
        rows = list.map(function (p, i) {
          return '<tr class="' + stalenessClass(p.last_verified) + '">' +
            '<td><input data-t="' + tab + '" data-i="' + i + '" data-f="program_name" value="' + esc(p.program_name) + '"></td>' +
            '<td>' + esc(p.university) + '</td><td>' + esc(p.degree_level) + '</td><td>' + esc(p.language) + '</td>' +
            '<td><select data-t="' + tab + '" data-i="' + i + '" data-f="tuition_status">' +
            ['Tuition-Free', 'Tuition-Free + Mandatory Fees', 'Conditional Tuition-Free', 'Low Tuition', 'Paid', 'Unknown / Needs Verification']
              .map(function (s) { return '<option' + (s === p.tuition_status ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
            '</select></td>' +
            '<td><input data-t="' + tab + '" data-i="' + i + '" data-f="verification_status" value="' + esc(p.verification_status) + '"></td>' +
            '<td><input type="date" data-t="' + tab + '" data-i="' + i + '" data-f="last_verified" value="' + esc(p.last_verified) + '"></td></tr>';
        });
      } else {
        head = ['Country', 'EU member', 'Tuition status', 'Verification', 'Last verified'];
        rows = list.map(function (c, i) {
          return '<tr class="' + stalenessClass(c.last_verified) + '">' +
            '<td><input data-t="' + tab + '" data-i="' + i + '" data-f="name" value="' + esc(c.name) + '"></td>' +
            '<td>' + (c.is_eu ? 'Yes' : 'No') + '</td>' +
            '<td><select data-t="' + tab + '" data-i="' + i + '" data-f="tuition_status">' +
            ['Tuition-Free', 'Tuition-Free + Mandatory Fees', 'Conditional Tuition-Free', 'Low Tuition', 'Paid', 'Unknown / Needs Verification']
              .map(function (s) { return '<option' + (s === c.tuition_status ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
            '</select></td>' +
            '<td><input data-t="' + tab + '" data-i="' + i + '" data-f="verification_status" value="' + esc(c.verification_status) + '"></td>' +
            '<td><input type="date" data-t="' + tab + '" data-i="' + i + '" data-f="last_verified" value="' + esc(c.last_verified || '') + '"></td></tr>';
        });
      }
      var stale6 = 0, stale12 = 0;
      list.forEach(function (r) { var a = daysAgo(r.last_verified); if (a >= 365) stale12++; else if (a >= 180) stale6++; });

      root.innerHTML =
        '<div class="panel"><div class="admin-tabs">' +
        ['universities', 'programs', 'countries'].map(function (t) {
          return '<button data-tab="' + t + '" class="' + (t === tab ? 'active' : '') + '">' + t[0].toUpperCase() + t.slice(1) + '</button>';
        }).join('') +
        '<button id="admin-export" class="primary" style="margin-left:auto">⬇ Export JSON</button></div>' +
        '<p class="small muted">Edits are kept in your browser only. Use <b>Export JSON</b> to download the updated file and commit it to <code>data/</code> (then re-run the seed script). ' +
        'Rows shaded <span class="stale-6" style="padding:1px 6px;border-radius:4px">amber</span> are older than 6 months; <span class="stale-12" style="padding:1px 6px;border-radius:4px">red</span> older than 12 months.</p>' +
        '<p class="small"><b>' + list.length + '</b> records · <b>' + stale6 + '</b> to re-verify (&gt;6 months) · <b>' + stale12 + '</b> overdue (&gt;12 months)</p>' +
        '<div class="table-wrap"><table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
        (rows.length ? rows.join('') : '<tr><td colspan="' + head.length + '">No records</td></tr>') +
        '</tbody></table></div></div>';

      root.querySelectorAll('button[data-tab]').forEach(function (b) {
        b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); render(); });
      });
      var ex = document.getElementById('admin-export');
      if (ex) ex.addEventListener('click', function () {
        var map = { universities: 'universities', programs: 'programs', countries: 'countries' };
        var blob = new Blob([JSON.stringify(state[map[tab]], null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = tab + '.json'; a.click();
        URL.revokeObjectURL(a.href);
      });
      root.querySelectorAll('[data-t]').forEach(function (el) {
        el.addEventListener('input', function () {
          var t = el.getAttribute('data-t'), i = Number(el.getAttribute('data-i')), f = el.getAttribute('data-f');
          var v = el.value;
          if (f === 'est_annual_mandatory_cost_eur') v = v === '' ? null : Number(v);
          state[t][i][f] = v; state.dirty = true;
        });
        el.addEventListener('change', function () {
          if (el.tagName === 'SELECT' || el.type === 'date') render();
        });
      });
    }

    Promise.all([
      fetch('../assets/data/universities.json').then(function (r) { return r.json(); }),
      fetch('../assets/data/programs.json').then(function (r) { return r.json(); }),
      fetch('../assets/data/countries.json').then(function (r) { return r.json(); })
    ]).then(function (res) {
      state.universities = res[0]; state.programs = res[1]; state.countries = res[2];
      render();
    }).catch(function () {
      root.innerHTML = '<div class="empty">Could not load the dataset. Open this page from the deployed site (the JSON lives under <code>assets/data/</code>).</div>';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav(); initHeroSearch(); initFavorites(); initCompare(); initListing(); initComparePage(); initAdmin();
  });
})();

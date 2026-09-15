/**
 * トーナメント画面（主催者用）と使用率選抜。
 * となめるの参加者 API は公開されていないため、選手は貼り付け / 手入力。
 * デッキコードは DECK LOG の共有コードとして記録し、ブラウザから API は叩かない。
 */
import { catalogCardIdentityKey, getCard, getCardCatalogSnapshot } from "./cards.js";
import { MAIN_SIZE, STORAGE_TOURNAMENT, T_ENERGY } from "./config.js";
import { parseDeckTextRecipe } from "./decklogImport.js";
import { showToast } from "./ui.js";
import { showAppView, showDeckBuilderView } from "./viewNav.js";
import {
  KOBOSHI_CS_PRESET,
  advancementLabel,
  computeUsageRateSelection,
  deckMapToRecipeText,
  deckMapTotal,
  decklogViewUrl,
  normalizePlayer,
  parseParticipantPaste,
  parseTonamelCompetitionId,
} from "./usageRateSelection.js";

function newPlayerId() {
  return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function emptyPlayer() {
  return normalizePlayer({
    id: newPlayerId(),
    name: "",
    wins: 0,
    losses: 0,
    dropped: false,
    deckCode: "",
    recipeText: "",
    deckMap: {},
  });
}

function defaultSettings() {
  return Object.assign({}, KOBOSHI_CS_PRESET);
}

function defaultState() {
  return { settings: defaultSettings(), players: [], selectedId: "" };
}

/** @type {{ settings: ReturnType<typeof defaultSettings>, players: ReturnType<typeof normalizePlayer>[], selectedId: string }} */
let state = defaultState();
let wired = false;

function identityFn(cardNo) {
  try {
    return catalogCardIdentityKey(cardNo) || String(cardNo || "");
  } catch (_) {
    return String(cardNo || "");
  }
}

function sanitizeMainDeckMap(deckMap) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const [no, qty] of Object.entries(deckMap || {})) {
    const q = Math.floor(Number(qty) || 0);
    if (q <= 0) continue;
    const card = getCard(no);
    if (card && card.type === T_ENERGY) continue;
    out[no] = (out[no] || 0) + q;
  }
  return out;
}

function applyRecipeText(player, text) {
  const recipeText = String(text || "");
  const parsed = parseDeckTextRecipe(recipeText, getCardCatalogSnapshot() || {});
  player.recipeText = recipeText;
  player.deckMap = sanitizeMainDeckMap(parsed.deckMap);
  player.recipeWarns = parsed.warns || [];
  return player;
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_TOURNAMENT,
      JSON.stringify({
        settings: state.settings,
        players: state.players.map(function (p) {
          return {
            id: p.id,
            name: p.name,
            wins: p.wins,
            losses: p.losses,
            dropped: !!p.dropped,
            deckCode: p.deckCode,
            recipeText: p.recipeText,
            deckMap: p.deckMap,
          };
        }),
      }),
    );
  } catch (err) {
    console.warn("[tournament] persist failed:", err);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_TOURNAMENT);
    if (!raw) {
      state = defaultState();
      return;
    }
    const data = JSON.parse(raw);
    const settings = Object.assign(defaultSettings(), data && data.settings ? data.settings : {});
    const players = Array.isArray(data && data.players) ? data.players : [];
    state = {
      settings: settings,
      selectedId: "",
      players: players.map(function (p, i) {
        const n = normalizePlayer(p, i);
        if (!n.id || n.id === "p_" + i) n.id = p && p.id ? String(p.id) : newPlayerId();
        if (!Object.keys(n.deckMap).length && n.recipeText) applyRecipeText(n, n.recipeText);
        return n;
      }),
    };
  } catch (err) {
    console.warn("[tournament] load failed:", err);
    state = defaultState();
  }
}

function compute() {
  return computeUsageRateSelection(state.players, {
    finalsSlots: state.settings.finalsSlots,
    poolMinWins: state.settings.poolMinWins,
    identityFn: identityFn,
  });
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cardLabel(cardNo) {
  const card = getCard(cardNo);
  const name = card && card.name ? String(card.name) : "";
  return name ? name + "（" + cardNo + "）" : String(cardNo || "");
}

function recipeStatus(p) {
  const n = deckMapTotal(p.deckMap);
  if (!n) return { cls: "is-empty", text: "未入力" };
  if (n === MAIN_SIZE) return { cls: "is-ok", text: n + "枚" };
  return { cls: "is-warn", text: n + "枚" };
}

function fillSettingsForm() {
  const s = state.settings;
  setVal("input-tourney-title", s.title);
  setVal("input-tourney-tonamel", s.tonamelUrl);
  setVal("input-tourney-date", s.dateLabel);
  setVal("input-tourney-capacity", s.capacity);
  setVal("input-tourney-swiss", s.swissRounds);
  setVal("input-tourney-finals", s.finalsSlots);
  setVal("input-tourney-pool-min", s.poolMinWins);
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "checkbox") el.checked = !!value;
  else el.value = value == null ? "" : String(value);
}

function readSettingsFromForm() {
  const s = state.settings;
  s.title = strVal("input-tourney-title") || s.title;
  s.tonamelUrl = strVal("input-tourney-tonamel");
  s.dateLabel = strVal("input-tourney-date");
  s.capacity = numVal("input-tourney-capacity", s.capacity);
  s.swissRounds = numVal("input-tourney-swiss", s.swissRounds);
  s.finalsSlots = Math.max(1, numVal("input-tourney-finals", s.finalsSlots));
  s.poolMinWins = Math.max(0, numVal("input-tourney-pool-min", s.poolMinWins));
}

function strVal(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "").trim() : "";
}

function numVal(id, fallback) {
  const el = document.getElementById(id);
  const v = Math.floor(Number(el && el.value));
  return Number.isFinite(v) ? v : fallback;
}

function render(opts) {
  opts = opts || {};
  fillSettingsForm();
  const result = compute();
  renderSummary(result);
  if (opts.skipPlayers) highlightSelectedRow();
  else renderPlayers(result);
  renderAdvance(result);
  renderCards(result);
  renderPlayerDetail(result);
}

function highlightSelectedRow() {
  document.querySelectorAll("#tourney-players-body tr[data-player-id]").forEach(function (tr) {
    tr.classList.toggle("is-selected", tr.getAttribute("data-player-id") === state.selectedId);
  });
}

function renderSummary(result) {
  const el = document.getElementById("tourney-summary");
  if (!el) return;
  const recipeOk = state.players.filter(function (p) {
    return deckMapTotal(p.deckMap) > 0;
  }).length;
  const tonamelId = parseTonamelCompetitionId(state.settings.tonamelUrl);
  el.innerHTML =
    "<div class=\"tourney-stat\"><span>選手</span><strong>" +
    state.players.length +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>レシピ</span><strong>" +
    recipeOk +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>集計対象</span><strong>" +
    result.poolCount +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>全勝</span><strong>" +
    result.undefeated.length +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>1敗</span><strong>" +
    result.oneLoss.length +
    "</strong></div>" +
    "<div class=\"tourney-stat\"><span>決勝枠</span><strong>" +
    result.finalsSlots +
    "</strong></div>" +
    (tonamelId
      ? "<div class=\"tourney-stat tourney-stat--link\"><span>となめる</span><a href=\"" +
        escapeHtml(state.settings.tonamelUrl) +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">" +
        escapeHtml(tonamelId) +
        "</a></div>"
      : "");
}

function renderPlayers(result) {
  const tb = document.getElementById("tourney-players-body");
  if (!tb) return;
  if (!state.players.length) {
    tb.innerHTML =
      "<tr><td colspan=\"8\" class=\"muted tourney-empty-row\">選手がいません。貼り付けか「選手を追加」から入れてください。</td></tr>";
    return;
  }
  tb.innerHTML = state.players
    .map(function (p) {
      const adv = advancementLabel(result, p.id);
      const rec = recipeStatus(p);
      const scored = result.players.find(function (x) {
        return x.id === p.id;
      });
      const pts = scored && scored.inPool ? String(scored.points) : "—";
      const selected = state.selectedId === p.id ? " is-selected" : "";
      return (
        "<tr class=\"tourney-player-row" +
        selected +
        "\" data-player-id=\"" +
        escapeHtml(p.id) +
        "\">" +
        "<td><input type=\"text\" class=\"input tourney-inline\" data-field=\"name\" value=\"" +
        escapeHtml(p.name) +
        "\" placeholder=\"名前\" /></td>" +
        "<td><input type=\"number\" min=\"0\" class=\"input tourney-inline tourney-inline--num\" data-field=\"wins\" value=\"" +
        p.wins +
        "\" /></td>" +
        "<td><input type=\"number\" min=\"0\" class=\"input tourney-inline tourney-inline--num\" data-field=\"losses\" value=\"" +
        p.losses +
        "\" /></td>" +
        "<td class=\"tourney-td-check\"><input type=\"checkbox\" data-field=\"dropped\" " +
        (p.dropped ? "checked " : "") +
        "/></td>" +
        "<td><input type=\"text\" class=\"input tourney-inline\" data-field=\"deckCode\" value=\"" +
        escapeHtml(p.deckCode) +
        "\" placeholder=\"DECK LOG\" spellcheck=\"false\" /></td>" +
        "<td><button type=\"button\" class=\"btn sm secondary\" data-act=\"recipe\">" +
        rec.text +
        "</button></td>" +
        "<td class=\"tourney-pts\">" +
        escapeHtml(pts) +
        "</td>" +
        "<td><span class=\"tourney-adv tourney-adv--" +
        adv.kind +
        "\">" +
        escapeHtml(adv.label) +
        "</span> <button type=\"button\" class=\"btn sm danger tourney-del\" data-act=\"del\" title=\"削除\">×</button></td>" +
        "</tr>"
      );
    })
    .join("");
}

function renderAdvance(result) {
  const el = document.getElementById("tourney-advance");
  if (!el) return;
  if (!state.players.length) {
    el.innerHTML = "<p class=\"muted\">選手を入れると進出一覧が出ます。</p>";
    return;
  }
  const lines = [];
  lines.push("<h3>決勝進出</h3>");
  lines.push("<ol class=\"tourney-advance-list\">");
  result.undefeated.forEach(function (p) {
    lines.push(advanceItem(p, "全勝"));
  });
  result.selectedOneLoss.forEach(function (p, i) {
    lines.push(advanceItem(p, "使用率 " + (i + 1) + "位"));
  });
  lines.push("</ol>");
  if (result.lottery.length) {
    lines.push(
      "<p class=\"tourney-lottery-note\"><strong>当落線上の同点 " +
        result.lottery.length +
        " 名</strong>で残り <strong>" +
        result.lotterySlots +
        " 枠</strong>。公式どおり抽選してください（この画面では抽選しません）。</p>",
    );
    lines.push("<ul class=\"tourney-advance-list tourney-advance-list--lottery\">");
    result.lottery.forEach(function (p) {
      lines.push("<li><button type=\"button\" class=\"tourney-linkish\" data-select=\"" + escapeHtml(p.id) + "\">" + escapeHtml(p.name || "（無名）") + "</button>　" + p.points + "P　" + p.wins + "勝1敗</li>");
    });
    lines.push("</ul>");
  }
  const need = result.finalsSlots - result.undefeated.length - result.selectedOneLoss.length;
  if (need > 0 && !result.lottery.length) {
    lines.push("<p class=\"tourney-warn\">進出者が決勝枠に足りません（あと " + need + " 名）。1敗の人数か枠数を確認してください。</p>");
  }
  if (result.undefeated.length >= result.finalsSlots) {
    lines.push("<p class=\"muted\">全勝が決勝枠以上のため、使用率選抜は発生しません。</p>");
  }
  el.innerHTML = lines.join("");
}

function advanceItem(p, kind) {
  return (
    "<li><span class=\"tourney-adv-kind\">" +
    escapeHtml(kind) +
    "</span> <button type=\"button\" class=\"tourney-linkish\" data-select=\"" +
    escapeHtml(p.id) +
    "\">" +
    escapeHtml(p.name || "（無名）") +
    "</button>　" +
    p.wins +
    "勝" +
    p.losses +
    "敗　" +
    p.points +
    "P</li>"
  );
}

function renderCards(result) {
  const el = document.getElementById("tourney-cards-body");
  if (!el) return;
  if (!result.cardTable.length) {
    el.innerHTML = "<tr><td colspan=\"3\" class=\"muted\">2勝以上のレシピが集まると、カードごとのポイントが出ます。</td></tr>";
    return;
  }
  el.innerHTML = result.cardTable
    .slice(0, 80)
    .map(function (row, i) {
      return (
        "<tr><td>" +
        (i + 1) +
        "</td><td>" +
        escapeHtml(cardLabel(row.cardNo)) +
        "</td><td class=\"tourney-pts\">" +
        row.pointsPerCopy +
        "</td></tr>"
      );
    })
    .join("");
}

function renderPlayerDetail(result) {
  const el = document.getElementById("tourney-player-detail");
  if (!el) return;
  const p = state.players.find(function (x) {
    return x.id === state.selectedId;
  });
  if (!p) {
    el.innerHTML = "<p class=\"muted\">選手行をクリックすると、レシピと内訳を編集できます。</p>";
    return;
  }
  const scored = result.players.find(function (x) {
    return x.id === p.id;
  });
  const rec = recipeStatus(p);
  const deckUrl = decklogViewUrl(p.deckCode);
  const warns = p.recipeWarns && p.recipeWarns.length ? "<p class=\"tourney-warn\">" + escapeHtml(p.recipeWarns.join(" / ")) + "</p>" : "";
  const rows = (scored && scored.breakdown ? scored.breakdown : [])
    .map(function (b) {
      return (
        "<tr><td>" +
        escapeHtml(cardLabel(b.cardNo)) +
        "</td><td>" +
        b.qty +
        "</td><td>" +
        b.perCopy +
        "</td><td class=\"tourney-pts\">" +
        b.subtotal +
        "</td></tr>"
      );
    })
    .join("");
  el.innerHTML =
    "<div class=\"tourney-detail-head\">" +
    "<h3>" +
    escapeHtml(p.name || "（無名）") +
    "</h3>" +
    "<p>" +
    p.wins +
    "勝" +
    p.losses +
    "敗　" +
    (scored && scored.inPool ? scored.points + "P（集計対象）" : "集計対象外") +
    "　レシピ " +
    rec.text +
    "</p>" +
    (deckUrl
      ? "<p><a href=\"" +
        escapeHtml(deckUrl) +
        "\" target=\"_blank\" rel=\"noopener noreferrer\">DECK LOG を開く</a>　<a href=\"https://ws4696.xyz/decklog/\" target=\"_blank\" rel=\"noopener noreferrer\">テキスト化ツール</a></p>"
      : "<p class=\"muted\">デッキコードがあると DECK LOG を開けます。自動取得はできません（CORS）。</p>") +
    "</div>" +
    warns +
    "<label class=\"field\"><span>レシピ（例: 4 x PL!N-bp1-002-R＋）</span>" +
    "<textarea id=\"tourney-recipe-text\" class=\"input tourney-recipe\" rows=\"12\" spellcheck=\"false\">" +
    escapeHtml(p.recipeText || deckMapToRecipeText(p.deckMap)) +
    "</textarea></label>" +
    "<div class=\"tourney-detail-actions\">" +
    "<button type=\"button\" class=\"btn primary\" id=\"btn-tourney-apply-recipe\">レシピを反映</button>" +
    "</div>" +
    "<div class=\"tourney-table-wrap\"><table class=\"tourney-table\"><thead><tr><th>カード</th><th>枚</th><th>1枚P</th><th>小計</th></tr></thead><tbody>" +
    (rows || "<tr><td colspan=\"4\" class=\"muted\">レシピがまだありません。</td></tr>") +
    "</tbody></table></div>";
}

function persistAndRender() {
  persist();
  render();
}

function findPlayer(id) {
  return state.players.find(function (p) {
    return p.id === id;
  });
}

function applyPresetKoboshi() {
  state.settings = defaultSettings();
  persistAndRender();
  showToast("小星CSの枠（決勝8・集計2勝以上・スイス5）を入れました");
}

function addPlayer() {
  const p = emptyPlayer();
  state.players.push(p);
  state.selectedId = p.id;
  persistAndRender();
}

function importPlayers(replace) {
  const ta = document.getElementById("tourney-import-text");
  const parsed = parseParticipantPaste(ta ? ta.value : "");
  if (parsed.errors.length && !parsed.players.length) {
    showToast(parsed.errors[0]);
    return;
  }
  const incoming = parsed.players.map(function (p) {
    const n = normalizePlayer(p);
    n.id = newPlayerId();
    if (n.recipeText) applyRecipeText(n, n.recipeText);
    return n;
  });
  if (replace) state.players = incoming;
  else state.players = state.players.concat(incoming);
  if (parsed.errors.length) showToast(incoming.length + " 人を取り込み（警告あり）");
  else showToast(incoming.length + " 人を取り込みました");
  closeDialog("dlg-tourney-import");
  persistAndRender();
}

function loadSample() {
  state.settings = defaultSettings();
  state.players = buildSamplePlayers();
  state.selectedId = state.players[0] ? state.players[0].id : "";
  persistAndRender();
  showToast("動作確認用の12人を入れました（小星CSの枠）");
}

function buildSamplePlayers() {
  const pop = { "PL!S-bp5-111-R": 4, "PL!SP-bp5-006-R": 4, "PL!N-pb1-011-R": 4, "PL!S-PR-026-PR": 4 };
  const mid = { "PL!S-bp5-111-R": 2, "PL!SP-bp5-006-R": 2, "PL!HS-PR-022-PR": 4, "PL!S-sd1-008-SD": 2 };
  const uniqA = { "PL!HS-bp5-001-P": 1, "PL!-bp5-007-R": 1, "PL!S-bp2-009-R": 1, "PL!S-pb1-004-R": 1 };
  const uniqB = { "PL!-bp5-003-R＋": 2, "PL!N-bp1-003-R＋": 1, "PL!SP-bp5-001-R＋": 2, "PL!SP-bp2-019-N": 3 };
  return [
    sampleRow("天王寺 璃奈", 5, 0, false, "RINA1", uniqA),
    sampleRow("中須 かすみ", 5, 0, false, "KASU1", pop),
    sampleRow("優木 せつ菜", 4, 1, false, "SETU1", uniqB),
    sampleRow("三船 栞子", 4, 1, false, "SHIK1", uniqA),
    sampleRow("近江 彼方", 4, 1, false, "KANA1", mid),
    sampleRow("桜坂 しずく", 4, 1, false, "SHIZ1", mid),
    sampleRow("宮下 愛", 4, 1, false, "AI001", Object.assign({}, mid, { "PL!S-bp5-111-R": 4 })),
    sampleRow("エマ・ヴェルデ", 4, 1, false, "EMMA1", Object.assign({}, pop, { "PL!S-bp2-016-N": 4 })),
    sampleRow("朝香 果林", 4, 1, false, "KARI1", pop),
    sampleRow("上原 歩夢", 4, 1, false, "AYUM1", pop),
    sampleRow("鐘 嵐珠", 3, 2, false, "LANZ1", pop),
    sampleRow("ミア・テイラー", 3, 1, true, "MIA01", mid),
  ];
}

function sampleRow(name, wins, losses, dropped, deckCode, deckMap) {
  const p = normalizePlayer({
    id: newPlayerId(),
    name: name,
    wins: wins,
    losses: losses,
    dropped: dropped,
    deckCode: deckCode,
    deckMap: deckMap,
    recipeText: deckMapToRecipeText(deckMap),
  });
  return p;
}

function copyResult() {
  const result = compute();
  const lines = ["区分\t名前\t勝\t負\tポイント\t結果"];
  result.players.forEach(function (p) {
    const adv = advancementLabel(result, p.id);
    const kind = p.dropped ? "リタイア" : isRecord(p);
    lines.push([kind, p.name, p.wins, p.losses, p.inPool ? p.points : "", adv.label].join("\t"));
  });
  const text = lines.join("\n");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      function () {
        showToast("結果をコピーしました（主催者用。公式は選手にポイント非公開）");
      },
      function () {
        fallbackCopy(text);
      },
    );
  } else {
    fallbackCopy(text);
  }
}

function isRecord(p) {
  if (p.losses === 0 && p.wins > 0 && !p.dropped) return "全勝";
  if (p.losses === 1 && !p.dropped) return "1敗";
  return "その他";
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    showToast("結果をコピーしました");
  } catch (_) {
    showToast("コピーできませんでした");
  }
  ta.remove();
}

function closeDialog(id) {
  const dlg = document.getElementById(id);
  if (dlg && typeof dlg.close === "function") dlg.close();
}

function openDialog(id) {
  const dlg = document.getElementById(id);
  if (dlg && typeof dlg.showModal === "function") dlg.showModal();
}

export function showTournamentView() {
  if (!document.getElementById("view-tournament")) {
    showToast("トーナメント画面を読み込めません。ページを再読込（Cmd+Shift+R）してください。");
    return;
  }
  showAppView("tournament");
  render();
}

export function initTournament() {
  loadState();
  if (wired) {
    if (/^#tournament\/?$/i.test(location.hash || "")) showTournamentView();
    return;
  }
  wired = true;

  document.getElementById("btn-tournament-back")?.addEventListener("click", function () {
    showDeckBuilderView();
  });

  ["input-tourney-title", "input-tourney-tonamel", "input-tourney-date"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("change", function () {
      readSettingsFromForm();
      persistAndRender();
    });
  });
  ["input-tourney-capacity", "input-tourney-swiss", "input-tourney-finals", "input-tourney-pool-min"].forEach(function (id) {
    document.getElementById(id)?.addEventListener("change", function () {
      readSettingsFromForm();
      persistAndRender();
    });
  });

  document.getElementById("btn-tourney-preset")?.addEventListener("click", applyPresetKoboshi);
  document.getElementById("btn-tourney-add")?.addEventListener("click", addPlayer);
  document.getElementById("btn-tourney-sample")?.addEventListener("click", function () {
    if (state.players.length && !window.confirm("動作確認用の12人で現在の選手を置き換えますか？")) return;
    loadSample();
  });
  document.getElementById("btn-tourney-clear")?.addEventListener("click", function () {
    if (!state.players.length) return;
    if (!window.confirm("選手を全員削除しますか？（大会設定は残します）")) return;
    state.players = [];
    state.selectedId = "";
    persistAndRender();
  });
  document.getElementById("btn-tourney-import-open")?.addEventListener("click", function () {
    openDialog("dlg-tourney-import");
  });
  document.getElementById("btn-tourney-import-add")?.addEventListener("click", function () {
    importPlayers(false);
  });
  document.getElementById("btn-tourney-import-replace")?.addEventListener("click", function () {
    importPlayers(true);
  });
  document.getElementById("btn-tourney-import-close")?.addEventListener("click", function () {
    closeDialog("dlg-tourney-import");
  });
  document.getElementById("btn-tourney-copy")?.addEventListener("click", copyResult);

  const tbody = document.getElementById("tourney-players-body");
  tbody?.addEventListener("change", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const tr = t.closest("tr[data-player-id]");
    if (!tr) return;
    const p = findPlayer(tr.getAttribute("data-player-id") || "");
    if (!p) return;
    const field = t.getAttribute("data-field");
    if (field === "name" || field === "deckCode") p[field] = t instanceof HTMLInputElement ? t.value : "";
    if (field === "wins" || field === "losses") p[field] = Math.max(0, Math.floor(Number(t instanceof HTMLInputElement ? t.value : 0) || 0));
    if (field === "dropped") p.dropped = t instanceof HTMLInputElement ? t.checked : false;
    persistAndRender();
  });
  tbody?.addEventListener("focusin", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const tr = t.closest("tr[data-player-id]");
    if (!tr) return;
    state.selectedId = tr.getAttribute("data-player-id") || "";
  });
  tbody?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const tr = t.closest("tr[data-player-id]");
    if (!tr) return;
    const id = tr.getAttribute("data-player-id") || "";
    const act = t.closest("[data-act]");
    const action = act && act.getAttribute("data-act");
    if (action === "del") {
      state.players = state.players.filter(function (p) {
        return p.id !== id;
      });
      if (state.selectedId === id) state.selectedId = "";
      persistAndRender();
      return;
    }
    state.selectedId = id;
    if (action === "recipe") {
      persistAndRender();
      const recipe = document.getElementById("tourney-recipe-text");
      if (recipe) recipe.focus();
      return;
    }
    if (t.closest("input,textarea,select")) {
      render({ skipPlayers: true });
      return;
    }
    render();
  });

  document.getElementById("tourney-advance")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    const btn = t.closest("[data-select]");
    if (!btn) return;
    state.selectedId = btn.getAttribute("data-select") || "";
    persistAndRender();
  });

  document.getElementById("tourney-player-detail")?.addEventListener("click", function (ev) {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id !== "btn-tourney-apply-recipe") return;
    const p = findPlayer(state.selectedId);
    const ta = document.getElementById("tourney-recipe-text");
    if (!p || !(ta instanceof HTMLTextAreaElement)) return;
    applyRecipeText(p, ta.value);
    persistAndRender();
    showToast("レシピを反映しました（" + deckMapTotal(p.deckMap) + "枚）");
  });

  if (/^#tournament\/?$/i.test(location.hash || "")) showTournamentView();
}

/**
 * Classifier-independent text requirements vs. manually maintained implementation contracts.
 * This is a static discrepancy detector, not a proof of gameplay correctness.
 */
import { createHash } from "node:crypto";
import { classifyCardAbility, splitAbilityByTriggers, cardAbilityRawText, abilityEffectIsAutomated } from "../../js/abilityEffects.js";
import { classifyJidouAutoSegment, jidouEffectIsAutomated } from "../../js/jidouAutoEffects.js";
import { classifyJoujiSegment } from "../../js/joujiEffects.js";
import { normalizeCardGroupText } from "../../js/cardGroups.js";
import { templateHandlesOwnCost } from "../../js/abilityRuntimeMeta.js";

const ACTIVE_TRIGGERS = new Set(["kidou", "toujyou", "live_start", "live_success", "jidou", "jouji"]);
const commonCostCapabilities = {
  "cost.self_wait": { flag: "costSelfWait" },
  "cost.hand_to_waiting": { field: "handDiscardToWaiting", notFlag: "costHandToDeckBottom" },
  "cost.hand_to_bottom": { field: "handDiscardToWaiting", flag: "costHandToDeckBottom" },
  "cost.energy": { field: "costEnergyCount", flag: "costEnergy" },
  "cost.optional": { flags: ["hasOptionalCost", "costHandDiscardOptional"] },
};

/** Reject malformed contracts instead of allowing an empty object to certify an action. */
export function validateSemanticContracts(contracts) {
  const object = (v) => v && typeof v === "object" && !Array.isArray(v);
  if (!object(contracts) || contracts.version !== 1 || !object(contracts.templates)) throw new Error("Invalid semantic contract schema");
  const keys = new Set(["field", "default", "value", "flag", "notFlag", "flags", "groupField", "heartGrant"]);
  for (const [template, contract] of Object.entries(contracts.templates)) {
    if (!object(contract) || !object(contract.capabilities) || !Object.keys(contract.capabilities).length) throw new Error(`Invalid contract capabilities: ${template}`);
    for (const [kind, spec] of Object.entries(contract.capabilities)) {
      if (spec === true) continue;
      const invalid = () => { throw new Error(`Invalid contract capability: ${template}.${kind}`); };
      if (!object(spec) || !Object.keys(spec).length || Object.keys(spec).some((key) => !keys.has(key))) invalid();
      if (!Object.keys(spec).some((key) => key !== "default")) invalid();
      for (const key of ["field", "flag", "notFlag", "groupField"]) {
        if (key in spec && (typeof spec[key] !== "string" || !spec[key].trim())) invalid();
      }
      if ("default" in spec && !("field" in spec)) invalid();
      if ("heartGrant" in spec && spec.heartGrant !== true) invalid();
      if ("flags" in spec && (!Array.isArray(spec.flags) || !spec.flags.length || spec.flags.some((v) => typeof v !== "string" || !v.trim()))) invalid();
    }
  }
}

export function plainAbilityText(raw) {
  return String(raw || "")
    .replace(/（ウェイト状態のメンバーが持つ[^）]+）/g, "")
    .replace(/\{\{[^|}]+\|([^}]+)\}\}/g, "$1")
    .replace(/\{\{[^}]+\}\}/g, "")
    .normalize("NFKC").replace(/\s+/g, "");
}

/** Requirements come only from the card text, never from its existing classification. */
export function extractAbilityRequirements(raw) {
  const text = plainAbilityText(raw);
  const colon = text.indexOf(":");
  const cost = colon < 0 ? "" : text.slice(0, colon);
  const body = colon < 0 ? text : text.slice(colon + 1);
  const requirements = [];
  function add(kind, evidence, amount) {
    if (!evidence) return;
    requirements.push({ kind, evidence, ...(amount == null ? {} : { amount }) });
  }
  function match(kind, re, source = body, amountGroup = null) {
    for (const m of source.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))) {
      add(kind, m[0], amountGroup == null ? undefined : Number(m[amountGroup]));
    }
  }
  match("cost.self_wait", /このメンバーをウェイト/, cost);
  match("cost.self_to_waiting", /このメンバーをステージから控え室に置/, cost);
  match("cost.hand_to_waiting", /手札(?:の[^:。]+?)?を([0-9]+)枚控え室に置/, cost, 1);
  match("cost.hand_to_bottom", /手札を([0-9]+)枚デッキの(?:一番)?下に置/, cost, 1);
  match("cost.energy", /(?:E|エネルギー)を?([0-9]+)枚?を?支払/, cost, 1);
  match("cost.energy", /(?:E|エネルギー)を支払/, cost);
  if (/もよい/.test(cost)) add("cost.optional", cost);
  match("effect.draw", /カードを([0-9]+)枚引/, body, 1);
  match("effect.mill", /デッキの上からカードを([0-9]+)枚控え室に置/, body, 1);
  match("effect.peek", /(?:デッキの上からカードを[0-9]+枚見る|デッキの一番上のカードを見る)/);
  match("effect.deck_top_to_bottom", /それをデッキの一番下に置/);
  match("effect.waiting_to_hand", /控え室(?:から|にある)[^。]*?([0-9]+)枚(?:公開して)?手札に加え/, body, 1);
  match("effect.yell_to_hand", /エールにより公開された[^。]*?([0-9]+)枚(?:まで)?(?:を)?手札に加え/, body, 1);
  match("effect.deck_to_hand", /その中から[^。]*?([0-9]+)枚(?:まで)?(?:公開して)?手札に加え/, body, 1);
  if (/エールにより公開された/.test(body) && /デッキの(?:一番)?下に置/.test(body)) {
    const m = body.match(/([0-9]+)枚まで/);
    add("effect.yell_to_bottom", (body.match(/エールにより公開された[^。]*デッキの(?:一番)?下に置[^。]*/) || [body])[0], m ? Number(m[1]) : 1);
  }
  // Tie the destination to the waiting-room source, never to an unrelated mention
  // such as “look at three; put one on top and the rest in the waiting room”.
  for (const destination of ["top", "bottom"]) {
    const word = destination === "top" ? "上" : "下";
    const direct = new RegExp(`控え室(?:から|にある)[^。]*?デッキの(?:一番)?${word}に[^。]*?置`, "g");
    const linked = new RegExp(`控え室(?:から|にある)[^。]*?選[ぶび][^。]*。それらを[^。]*?デッキの(?:一番)?${word}に[^。]*?置`, "g");
    const evidence = [...body.matchAll(direct), ...body.matchAll(linked)];
    for (const m of evidence) {
      if (destination === "bottom" && /エールにより公開された/.test(m[0])) continue;
      const count = m[0].match(/([0-9]+)枚まで選[ぶび]/);
      add(`effect.waiting_to_${destination}`, m[0], count ? Number(count[1]) : undefined);
    }
  }
  match("effect.choose_order", /好きな順番/);
  match("effect.shuffle_selected", /それらをシャッフル/);
  // Icons in reminder text are excluded, and a printed heart in a condition is not a grant.
  for (const blade of body.matchAll(/(?:ブレード)+を得る/g)) {
    add("effect.grant_blade", blade[0], (blade[0].match(/ブレード/g) || []).length);
  }
  match("effect.grant_blade", /ブレードを([0-9]+)(?:つ|個)得る/, body, 1);
  for (const grant of body.matchAll(/(?:(?:heart0?[1-6]|ハート))+を得る/ig)) {
    const hearts = {};
    for (const token of grant[0].matchAll(/heart0?([1-6])|ハート/ig)) {
      const key = token[1] ? "heart0" + token[1] : "all";
      hearts[key] = (hearts[key] || 0) + 1;
    }
    add("effect.grant_heart", grant[0], Object.values(hearts).reduce((a, b) => a + b, 0));
    requirements.at(-1).hearts = hearts;
  }
  match("effect.score", /(?:ライブの合計|このカードの)スコアを\+([0-9]+)する/, body, 1);
  match("effect.opponent_wait", /相手のステージ[^。]*?ウェイトにする/);
  match("effect.disable_ability", /能力を[^。]*無効にする/);
  match("effect.yell_from_bottom", /自分のエールは[^。]*デッキの上から[^。]*代わりにデッキの下から/);
  match("duration.live_end", /ライブ終了時まで/);
  const stageGroup = body.match(/ステージに『([^』]+)』のメンバーが([0-9]+)人以上/);
  if (stageGroup) {
    add("condition.stage_group_count", stageGroup[0], Number(stageGroup[2]));
    requirements.at(-1).group = stageGroup[1];
  }
  match("condition.shared_stage_color", /それらのメンバーが同じ色のハートを持つ/);
  match("condition.center_source", /\[センター\]/, text);
  match("condition.center_target", /自分のセンターエリアにいる/);
  match("condition.original_heart_limit", /元々持つハートの数が([0-9]+)つ以下/, body, 1);
  match("condition.yell_live_count", /ライブカードが([0-9]+)枚以上/, body, 1);
  for (const baton of body.matchAll(/(?:『([^』]+)』の)?メンバー([0-9]+)人からバトンタッチ/g)) {
    add("condition.baton_two", baton[0], Number(baton[2]));
    if (baton[1]) requirements.at(-1).group = baton[1];
  }
  match("condition.baton_cost_sum", /コストの合計が([0-9]+)/, body, 1);
  match("condition.each_success_name", /成功ライブカード置き場[^。]*各ライブカードにつき[^。]*同じカード名/);
  match("condition.no_blade_heart", /ブレードハートを持たない/);
  match("condition.per_moved_card", /これによりデッキの下に置いたカード([0-9]+)枚につき/, body, 1);
  if (/スコアを持つ/.test(body) && /ALLブレードを持つ/.test(body) && /無2/.test(body)) add("condition.category_selection", body);
  const turns = text.match(/ターン([0-9]+)回/);
  if (turns) add("limit.per_turn", turns[0], Number(turns[1]));
  if (/成功ライブカード置き場/.test(body) && /場合|かぎり/.test(body)) add("condition.success_live_context", body);
  if (/場合|かぎり|このターン中/.test(body) && !requirements.some((r) => r.kind.startsWith("condition."))) add("condition.other", body);
  return { text, cost, body, requirements };
}

function valueAt(object, path) {
  return path.split(".").reduce((value, key) => value == null ? undefined : value[key], object);
}

function evaluateSpec(spec, classification, requirement) {
  if (spec === true) return requirement.amount == null ? "matched" : "unverified_amount";
  if (spec.heartGrant) {
    const hearts = { ...(classification.grantHeartSlotMap || {}) };
    if (classification.requiredHeartSlot) hearts["heart0" + classification.requiredHeartSlot] = classification.grantHeartSlotCount ?? 1;
    if (classification.grantAllHeartCount) hearts.all = classification.grantAllHeartCount;
    return Object.entries(requirement.hearts || {}).every(([color, count]) => hearts[color] === count) ? "matched" : "heart_grant_mismatch";
  }
  if (spec.groupField && requirement.group && normalizeCardGroupText(valueAt(classification, spec.groupField)) !== normalizeCardGroupText(requirement.group)) return "group_mismatch";
  if (spec.flag && valueAt(classification, spec.flag) !== true) return "missing_flag";
  if (spec.notFlag && valueAt(classification, spec.notFlag) === true) return "wrong_destination";
  if (spec.flags && !spec.flags.some((key) => valueAt(classification, key) === true)) return "missing_flag";
  if (spec.field || Object.hasOwn(spec, "value")) {
    const actual = spec.field ? (valueAt(classification, spec.field) ?? spec.default) : spec.value;
    if (actual == null) return "missing_field";
    if (requirement.amount != null && actual !== requirement.amount) return "amount_mismatch";
    if (spec.field && Object.hasOwn(spec, "value") && JSON.stringify(actual) !== JSON.stringify(spec.value)) return "value_mismatch";
  }
  if (requirement.amount != null && !spec.field && !Object.hasOwn(spec, "value")) return "unverified_amount";
  return "matched";
}

function flattenClassification(classification) {
  if (classification.template !== "ability_sequence") return [classification];
  return (classification.steps || []).flatMap(flattenClassification);
}

/** An injected classifier is for regression tests; production always uses the existing engine. */
export function auditAbilitySegment(card, segment, contracts, options = {}) {
  const { requirements, text, cost, body } = extractAbilityRequirements(segment.text);
  const trigger = segment.trigger;
  let classification;
  const issues = [];
  function issue(code, severity, kind, evidence, message) {
    issues.push({ code, severity, kind, evidence, message });
  }
  try {
    if (options.classify) classification = options.classify(card, segment);
    else if (trigger === "jidou") classification = classifyJidouAutoSegment(segment.text);
    else if (trigger === "jouji") classification = classifyJoujiSegment(segment.text);
    else classification = classifyCardAbility(card, trigger, segment.text);
  } catch (err) {
    issue("classification_error", "error", "classification", text, String(err.message || err));
  }
  const template = classification?.template || classification?.kind || "unclassified";
  const unavailable = !classification || ["none", "guided_manual", "jidou_manual", "passive_track", "unclassified"].includes(template);
  if (unavailable) issue("unimplemented", "error", "classification", text, "分類未対応／手動処理。過去に修正したカードでも除外しない。");
  const leaves = classification ? flattenClassification(classification) : [];
  const allLeaves = leaves.length ? leaves : [classification || {}];
  if (!unavailable && trigger !== "jouji" && !(trigger === "jidou" ? jidouEffectIsAutomated(template) : abilityEffectIsAutomated(template))) issue("automation_not_declared", "review", "runtime", text, "分類済みだが自動処理対象として登録されていない。");
  if (!unavailable && options.handlers && trigger !== "jouji") {
    for (const leaf of allLeaves) {
      if (!options.handlers.has(leaf.template)) issue("handler_not_found", "review", "runtime", text, `${leaf.template}: 実ハンドラの対応を静的に確認できない。自動化フラグだけで合格にしない。`);
    }
  }
  const results = requirements.map((requirement) => {
    const candidates = [];
    // Costs of a sequence belong to its parent; leaf costs alone must not conceal a missing parent cost.
    if (requirement.kind.startsWith("cost.") && classification && (!templateHandlesOwnCost(template) || template === "ability_sequence")) {
      const spec = commonCostCapabilities[requirement.kind];
      if (spec) candidates.push({ spec, cl: classification });
    }
    if (requirement.kind === "limit.per_turn" && classification) candidates.push({ spec: { field: "perTurnLimit" }, cl: classification });
    for (const leaf of allLeaves) {
      if (template === "ability_sequence" && requirement.kind.startsWith("cost.")) continue;
      const contract = contracts.templates?.[leaf.template || leaf.kind];
      const spec = contract?.capabilities?.[requirement.kind];
      if (spec) candidates.push({ spec, cl: leaf });
    }
    if (!candidates.length) {
      const known = allLeaves.some((leaf) => contracts.templates?.[leaf.template || leaf.kind]);
      const code = known && requirement.kind.startsWith("effect.") ? "missing_processing_contract" : "requirement_not_verified";
      issue(code, code === "missing_processing_contract" ? "suspect" : "review", requirement.kind, requirement.evidence, "カード文の要求を、登録済みの処理契約で確認できない。実装漏れの疑い／契約追加の要確認。");
      return { ...requirement, status: "unverified" };
    }
    const evaluations = candidates.map(({ spec, cl }) => evaluateSpec(spec, cl, requirement));
    if (evaluations.includes("matched")) return { ...requirement, status: "matched" };
    const numericOnly = evaluations.every((s) => s === "unverified_amount");
    issue(numericOnly ? "amount_not_verified" : "contract_mismatch", numericOnly ? "review" : "suspect", requirement.kind, requirement.evidence, numericOnly ? "処理の存在は確認できるが、枚数・回数を契約で確認できない。" : `分類結果がカード文の要求と一致しない: ${evaluations.join(", ")}`);
    return { ...requirement, status: "mismatch", evaluations };
  });
  if (!unavailable && !allLeaves.every((leaf) => contracts.templates?.[leaf.template || leaf.kind])) issue("template_contract_missing", "review", "contract", text, "未登録テンプレート。対応済みとは判定しない。");
  for (const kind of new Set(requirements.filter((r) => r.kind.startsWith("effect.")).map((r) => r.kind))) {
    if (requirements.filter((r) => r.kind === kind).length > 1) issue("repeated_action_needs_review", "review", kind, text, "同種の処理が複数回現れる。実行回数・分岐・順序の静的保証はしていない。");
  }
  if (!requirements.length && text) issue("text_not_understood", "review", "text", text, "この能力文から処理要素を抽出できない。");
  if (body && !requirements.some((r) => r.kind.startsWith("effect."))) issue("body_not_understood", "review", "text.body", body, "コストや条件だけが読めても、効果本文を確認できなければ合格にしない。");
  // Even if one action matched, an unrecognized extra sentence cannot disappear into a green result.
  for (const clause of body.split(/。|その後[、,]?|さらに[、,]?/).filter(Boolean)) {
    if (!/^」?を得る$/.test(clause) && !requirements.some((r) => r.kind.startsWith("effect.") && (r.evidence.includes(clause) || clause.includes(r.evidence)))) {
      issue("followup_needs_review", "review", "text.followup", clause, "後続処理は順序・条件を含めて確認する。単一の分類結果だけで完了扱いにしない。");
    }
  }
  const status = unavailable ? "unimplemented" : issues.some((i) => i.severity === "error" || i.severity === "suspect") ? "suspect" : issues.length ? "needs_review" : "checked_known_rules";
  const fingerprint = createHash("sha256").update(JSON.stringify([card.card_no, trigger, segment.index, segment.text, contracts.version])).digest("hex").slice(0, 20);
  return { card_no: card.card_no, name: card.name, type: card.type, trigger, segment_index: segment.index, template, status, fingerprint, text: segment.text, cost, requirements: results, classification, issues };
}

export function discoverAbilityHandlers(sources) {
  const handlers = new Set();
  for (const source of sources) {
    for (const m of source.matchAll(/\bcl\.template\s*===\s*["']([a-z0-9_]+)["']/g)) handlers.add(m[1]);
  }
  // Composite has a dispatcher, not a leaf implementation.
  handlers.add("ability_sequence");
  return handlers;
}

export function auditAbilityCatalog(catalog, contracts, options = {}) {
  validateSemanticContracts(contracts);
  const records = [];
  let cards = 0;
  let withoutAbility = 0;
  const statusCounts = { unimplemented: 0, suspect: 0, needs_review: 0, checked_known_rules: 0 };
  for (const [key, card] of Object.entries(catalog)) {
    if (key.startsWith("_") || !card || typeof card !== "object") continue;
    if (options.cardIds && !options.cardIds.has(card.card_no || key)) continue;
    cards++;
    const segments = splitAbilityByTriggers(cardAbilityRawText(card)).filter((s) => ACTIVE_TRIGGERS.has(s.trigger));
    if (!segments.length) withoutAbility++;
    segments.forEach((original, index) => {
      // 「登場/ライブ開始時」の共通本文を、両方の発動契機で監査する。
      const shared = /^[\/／]*$/.test(plainAbilityText(original.text));
      const following = shared ? segments.slice(index + 1).find((s) => !/^[\/／]*$/.test(plainAbilityText(s.text))) : null;
      const segment = following ? { ...original, text: following.text } : original;
      const record = auditAbilitySegment({ ...card, card_no: card.card_no || key }, { ...segment, index }, contracts, options);
      records.push(record); statusCounts[record.status]++;
    });
  }
  const issueCounts = {};
  records.forEach((r) => r.issues.forEach((i) => { issueCounts[i.code] = (issueCounts[i.code] || 0) + 1; }));
  return {
    schema_version: 1, contract_version: contracts.version,
    scope: options.cardIds ? "selected_cards" : "full_catalog",
    summary: { cards, without_ability: withoutAbility, segments: records.length, statuses: statusCounts, issues: issueCounts },
    limitation: "静的な既知ルールの照合のみ。checked_known_rulesも実プレイの正しさを保証しない。未知の文言・未登録契約は要確認。過去の修正履歴による除外なし。",
    records,
  };
}

/** Only the managed block changes; Cursor's/manual notes before and after are preserved. */
export function updateSemanticAuditHandoff(existing, report) {
  const begin = "<!-- semantic-audit:start -->";
  const end = "<!-- semantic-audit:end -->";
  const from = existing.indexOf(begin);
  const to = existing.indexOf(end);
  if (from < 0 || to < from || existing.indexOf(begin, from + begin.length) >= 0 || existing.indexOf(end, to + end.length) >= 0) throw new Error("HANDOFF.md requires exactly one ordered semantic-audit marker pair");
  if (report.scope !== "full_catalog") throw new Error("A scoped audit cannot update the full-catalog handoff");
  const counts = report.summary.statuses;
  const summary = `${begin}\n最新監査: ${report.generated_at}。対象${report.summary.cards}枚／${report.summary.segments}セグメント。未対応${counts.unimplemented}／不一致の疑い${counts.suspect}／要確認${counts.needs_review}／既知ルール照合${counts.checked_known_rules}。\n結果: [Markdown](./ability-semantic-audit.md) / [JSON](./ability-semantic-audit.json)。実プレイ保証ではない。\n${end}`;
  return existing.slice(0, from) + summary + existing.slice(to + end.length);
}

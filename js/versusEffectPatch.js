/**
 * 対戦モード online 効果パッチの**純粋コア**（DOM 非依存）。
 *
 * 対象側クライアントが受信した EffectRequest.payload を自分の盤面（board）へ適用する
 * ロジックを、`js/simulator.js` の `applyVersusEffectPatchLocally` と共有するために切り出したもの。
 * これにより Node 上（`scripts/verify-versus-online-sim.mjs`）で全 patchKind を自動検証できる。
 *
 * board 形状（simulator.js の state と同型のサブセット）:
 *   { deck:[], hand:[], stage:{left,center,right}, liveArea:{left,center,right},
 *     waitingRoom:[], resolutionArea:[], successfulLiveArea:[], energyArea:[] }
 *
 * カードは最低限 { id, type } を持つ想定。type がメンバーかは hooks.isMember で判定。
 *
 * 正本: docs/versus-online-effect-protocol.md §3
 */

/** 対応する patchKind（この順序＝ドキュメント §3 の並び） */
export const VERSUS_EFFECT_PATCH_KINDS = [
  "stage_wait_members",
  "stage_grant_heart",
  "deck_draw_top",
  "waiting_to_deck_bottom",
  "stage_activate_members",
  "stage_return_waiting",
  "hand_discard_pick",
  "hand_to_waiting",
  "waiting_to_hand",
  "live_to_waiting",
  "energy_to_wait",
  "energy_discard",
  "success_live_to_waiting",
  "deck_discard_top",
  "deck_shuffle",
];

const STAGE_COLS = ["left", "center", "right"];

/** @param {*} arr */
function defaultShuffle(arr) {
  const out = Array.isArray(arr) ? arr.slice() : [];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

/**
 * @param {*} board
 * @param {{ patchKind: string } & Record<string, *>} payload
 * @param {{
 *   eachStageMembers?: () => any[],
 *   waitMember?: (m: any) => void,
 *   removeStageToWaiting?: (m: any) => boolean,
 *   ensureFields?: (m: any) => void,
 *   shuffle?: (arr: any[]) => any[],
 * }} [hooks]
 * @returns {{ ok: boolean, applied: number }}
 */
export function applyVersusEffectPatch(board, payload, hooks) {
  const h = hooks || {};
  const patchKind = payload ? String(payload.patchKind || "") : "";
  let applied = 0;

  const eachStageMembers =
    h.eachStageMembers ||
    function () {
      /** @type {any[]} */
      const out = [];
      STAGE_COLS.forEach(function (col) {
        (board.stage[col] || []).forEach(function (c) {
          if (c) out.push(c);
        });
      });
      return out;
    };
  const waitMember =
    h.waitMember ||
    function (m) {
      m.isRotated = true;
      m.lcWait = true;
      m.lcActive = false;
    };
  const removeStageToWaiting =
    h.removeStageToWaiting ||
    function (m) {
      if (!m || m.id == null) return false;
      for (let ci = 0; ci < STAGE_COLS.length; ci++) {
        const slot = board.stage[STAGE_COLS[ci]] || [];
        const idx = slot.findIndex(function (c) {
          return c && String(c.id) === String(m.id);
        });
        if (idx >= 0) {
          board.waitingRoom.push(slot.splice(idx, 1)[0]);
          return true;
        }
      }
      return false;
    };
  const ensureFields =
    h.ensureFields ||
    function (m) {
      if (!m.playBonusHeartSlotsAlways) m.playBonusHeartSlotsAlways = {};
    };
  const shuffle = h.shuffle || defaultShuffle;

  if (patchKind === "stage_wait_members") {
    const waitIds = Array.isArray(payload.instIds) ? payload.instIds : [];
    waitIds.forEach(function (pid) {
      let found = null;
      eachStageMembers().forEach(function (m) {
        if (m && String(m.id) === String(pid)) found = m;
      });
      if (found && found.lcWait !== true) {
        waitMember(found);
        applied++;
      }
    });
  } else if (patchKind === "stage_grant_heart") {
    const grantSlot = Math.floor(Number(payload.slot) || 0);
    const grantCount = Math.max(1, Math.floor(Number(payload.count) || 1));
    if (grantSlot >= 1 && grantSlot <= 6) {
      eachStageMembers().forEach(function (m) {
        if (!m || String(m.id) !== String(payload.instId)) return;
        ensureFields(m);
        m.playBonusHeartSlotsAlways[grantSlot] =
          Math.floor(Number(m.playBonusHeartSlotsAlways[grantSlot]) || 0) + grantCount;
        applied++;
      });
    }
  } else if (patchKind === "deck_draw_top") {
    const drawN = Math.max(1, Math.floor(Number(payload.count) || 1));
    /** @type {any[]} */
    const drawn = [];
    for (let dp = 0; dp < drawN && board.deck.length; dp++) drawn.push(board.deck.shift());
    drawn.forEach(function (c) {
      board.hand.push(c);
    });
    applied = drawn.length;
  } else if (patchKind === "waiting_to_deck_bottom") {
    const wdbIds = Array.isArray(payload.instIds) ? payload.instIds : [];
    wdbIds.forEach(function (pid) {
      const wi = board.waitingRoom.findIndex(function (c) {
        return c && String(c.id) === String(pid);
      });
      if (wi >= 0) {
        board.deck.push(board.waitingRoom.splice(wi, 1)[0]);
        applied++;
      }
    });
  } else if (patchKind === "stage_activate_members") {
    const actIds = Array.isArray(payload.instIds) ? payload.instIds : [];
    eachStageMembers().forEach(function (m) {
      if (!m) return;
      const hit =
        !actIds.length ||
        actIds.some(function (pid) {
          return String(pid) === String(m.id);
        });
      if (hit && (m.lcWait === true || m.lcActive === false || m.isRotated === true)) {
        m.lcWait = false;
        m.lcActive = true;
        m.isRotated = false;
        applied++;
      }
    });
  } else if (patchKind === "stage_return_waiting") {
    const retIds = Array.isArray(payload.instIds) ? payload.instIds : [];
    retIds.forEach(function (pid) {
      let foundRet = null;
      eachStageMembers().forEach(function (m) {
        if (m && String(m.id) === String(pid)) foundRet = m;
      });
      if (foundRet && removeStageToWaiting(foundRet)) applied++;
    });
  } else if (patchKind === "hand_discard_pick" || patchKind === "hand_to_waiting") {
    const handIds = Array.isArray(payload.instIds) ? payload.instIds : [];
    if (handIds.length) {
      handIds.forEach(function (pid) {
        const hi = board.hand.findIndex(function (c) {
          return c && String(c.id) === String(pid);
        });
        if (hi >= 0) {
          board.waitingRoom.push(board.hand.splice(hi, 1)[0]);
          applied++;
        }
      });
    } else {
      const discN = Math.max(1, Math.floor(Number(payload.count) || 1));
      for (let hd = 0; hd < discN && board.hand.length; hd++) {
        board.waitingRoom.push(board.hand.pop());
        applied++;
      }
    }
  } else if (patchKind === "waiting_to_hand") {
    const wthIds = Array.isArray(payload.instIds) ? payload.instIds : [];
    wthIds.forEach(function (pid) {
      const wthi = board.waitingRoom.findIndex(function (c) {
        return c && String(c.id) === String(pid);
      });
      if (wthi >= 0) {
        board.hand.push(board.waitingRoom.splice(wthi, 1)[0]);
        applied++;
      }
    });
  } else if (patchKind === "live_to_waiting") {
    const ltwIds = Array.isArray(payload.instIds) ? payload.instIds : [];
    STAGE_COLS.forEach(function (col) {
      const slot = board.liveArea[col] || [];
      for (let li = slot.length - 1; li >= 0; li--) {
        const lc = slot[li];
        if (!lc) continue;
        const lhit =
          !ltwIds.length ||
          ltwIds.some(function (pid) {
            return String(pid) === String(lc.id);
          });
        if (lhit) {
          lc.lcWait = false;
          board.waitingRoom.push(slot.splice(li, 1)[0]);
          applied++;
        }
      }
    });
  } else if (patchKind === "energy_to_wait") {
    const ewN = Math.max(1, Math.floor(Number(payload.count) || 1));
    let ewDone = 0;
    (board.energyArea || []).forEach(function (e) {
      if (ewDone >= ewN || !e) return;
      if (e.lcActive !== false && e.lcWait !== true) {
        e.lcActive = false;
        e.lcWait = true;
        ewDone++;
        applied++;
      }
    });
  } else if (patchKind === "energy_discard") {
    const edIds = Array.isArray(payload.instIds) ? payload.instIds : [];
    if (edIds.length) {
      edIds.forEach(function (pid) {
        const ei = board.energyArea.findIndex(function (c) {
          return c && String(c.id) === String(pid);
        });
        if (ei >= 0) {
          board.waitingRoom.push(board.energyArea.splice(ei, 1)[0]);
          applied++;
        }
      });
    } else {
      const edN = Math.max(1, Math.floor(Number(payload.count) || 1));
      for (let ed = 0; ed < edN && board.energyArea.length; ed++) {
        board.waitingRoom.push(board.energyArea.pop());
        applied++;
      }
    }
  } else if (patchKind === "success_live_to_waiting") {
    const slwIds = Array.isArray(payload.instIds) ? payload.instIds : [];
    if (slwIds.length) {
      slwIds.forEach(function (pid) {
        const si = board.successfulLiveArea.findIndex(function (c) {
          return c && String(c.id) === String(pid);
        });
        if (si >= 0) {
          board.waitingRoom.push(board.successfulLiveArea.splice(si, 1)[0]);
          applied++;
        }
      });
    } else {
      const slwN = Math.max(1, Math.floor(Number(payload.count) || 1));
      for (let slw = 0; slw < slwN && board.successfulLiveArea.length; slw++) {
        board.waitingRoom.push(board.successfulLiveArea.pop());
        applied++;
      }
    }
  } else if (patchKind === "deck_discard_top") {
    const ddN = Math.max(1, Math.floor(Number(payload.count) || 1));
    for (let dd = 0; dd < ddN && board.deck.length; dd++) {
      board.waitingRoom.push(board.deck.shift());
      applied++;
    }
  } else if (patchKind === "deck_shuffle") {
    board.deck = shuffle(board.deck);
    applied = 1;
  } else {
    return { ok: false, applied: 0 };
  }

  return { ok: true, applied: applied };
}

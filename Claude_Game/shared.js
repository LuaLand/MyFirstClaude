// 메인 화면과 모든 게임이 함께 쓰는 코드: 게임 목록 + 레벨·경험치
// 게임을 깨면 같은 경험치가 '전체 레벨'과 '그 게임 레벨'에 함께 쌓임

// ---------- 게임 목록 ----------
// href는 메인(index.html) 기준 경로 / lvKey: 게임별 레벨 저장 키
// bests: { 표시 이름: 최고 기록 저장 키 } / bestUnit: 기록 단위
const GAMES = [
  {
    id: 'mission15',
    title: '15초 미션',
    desc: '15초 안에 미니게임 3개를 모두 깨라!',
    href: 'games/mission15.html',
    lvKey: 'lv15',
    bests: { Easy: 'best15', Normal: 'best15_normal', Hard: 'best15_hard' },
    bestUnit: '초',
  },
  {
    id: 'rps',
    title: '가위바위보',
    desc: '10판 운 승부, 또는 15초 동안 이기는 패 골라내기!',
    href: 'games/rps.html',
    lvKey: 'lv_rps',
    // 15초 모드는 점수 체계가 바뀌어(정답 +1 / 오답 -1) v2 키로 새로 시작
    bests: { '일반': 'rps_best', Easy: 'rps2_best_easy', Normal: 'rps2_best_normal', Hard: 'rps2_best_hard' },
    bestUnit: '점',
  },
  {
    id: 'mole',
    title: '두더지 잡기',
    desc: '15초 동안 두더지를 잡아라! 황금 두더지는 +30, 폭탄은 -50.',
    href: 'games/mole.html',
    lvKey: 'lv_mole',
    // 점수 체계가 바뀌어(일반 +10 / 황금 +30 / 폭탄 -50 / 도망 -10 / 헛방 -1) v4 키로 새로 시작
    bests: { Easy: 'mole4_best_easy', Normal: 'mole4_best_normal', Hard: 'mole4_best_hard' },
    bestUnit: '점',
  },
  {
    id: 'brick',
    title: '벽돌깨기',
    desc: '60초 안에 벽돌 24개를 모두 깨라! 4개마다 스피드 업.',
    href: 'games/brick.html',
    lvKey: 'lv_brick',
    bests: { Easy: 'brick_best_easy', Normal: 'brick_best_normal', Hard: 'brick_best_hard' },
    bestUnit: '점',
  },
  {
    id: 'runner',
    title: '시나모롤 런',
    desc: '귀를 팔랑이며 하늘을 날아라! 낮 · 밤 · 폭풍우 3가지 하늘.',
    href: 'games/runner.html',
    lvKey: 'lv_runner',
    bests: { Easy: 'runner_best_easy', Normal: 'runner_best_normal', Hard: 'runner_best_hard' },
    bestUnit: '점',
  },
];

// ---------- 페이지 이동 ----------
// 한 파일로 포장된 버전(dist/Claude_Game.html)에서는 바깥 틀(__pack)이 페이지를 바꿔 줌
const PACK = (() => { try { return (window.parent !== window && window.parent.__pack) || null; } catch { return null; } })();
function goTo(href) { if (PACK) PACK.go(href); else location.href = href; }
if (PACK) document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || /^(https?:|#|mailto:)/.test(a.getAttribute('href'))) return;
  e.preventDefault();
  PACK.go(a.getAttribute('href'));
});

// 예전 점수 체계(정답 +3)의 가위바위보 15초 모드 기록 정리
try { ['rps_best_easy', 'rps_best_normal', 'rps_best_hard'].forEach(k => localStorage.removeItem(k)); } catch {}
// 예전 점수 체계의 두더지 잡기 · 난이도가 없던 벽돌깨기·시나모롤 런 기록 정리
try { ['mole_best_easy', 'mole2_best_easy', 'mole2_best_normal', 'mole2_best_hard', 'mole3_best_easy', 'mole3_best_normal', 'mole3_best_hard', 'brick_best', 'runner_best'].forEach(k => localStorage.removeItem(k)); } catch {}

// ---------- 레벨 ----------
// 다음 레벨까지 필요 경험치 = Lv² × 1000 (exp는 현재 레벨 안에서 쌓인 양)
const LV_ALL_KEY = 'lv_all';
const needExp = lv => lv * lv * 1000;
const fmt = n => n.toLocaleString('ko-KR');

function loadLv(key = LV_ALL_KEY) {
  try {
    const s = JSON.parse(localStorage.getItem(key));
    if (s && s.lv >= 1 && s.exp >= 0) return { lv: s.lv, exp: s.exp };
  } catch {}
  return { lv: 1, exp: 0 };
}
function saveLv(key, s) { try { localStorage.setItem(key, JSON.stringify(s)); } catch {} }

function gainExp(key, gain) {
  const from = loadLv(key);
  const to = { ...from, exp: from.exp + gain };
  while (to.exp >= needExp(to.lv)) { to.exp -= needExp(to.lv); to.lv++; }
  saveLv(key, to);
  return { from, to };
}

// 게임 클리어 시 호출 → { all: 전체 레벨 변화, game: 게임 레벨 변화 }
function giveExp(gameLvKey, gain) {
  gain = Math.max(0, gain); // 음수 EXP로 레벨이 깎이지 않도록
  return { all: gainExp(LV_ALL_KEY, gain), game: gainExp(gameLvKey, gain) };
}

function loadRecord(key) {
  try { return parseFloat(localStorage.getItem(key)) || null; } catch { return null; }
}

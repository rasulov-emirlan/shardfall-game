// Pixel-art sprites defined as char grids + palettes. Rendered pixel-by-pixel.
// '.' = transparent. Each sprite is square-ish; size inferred from rows.

const P = {
  // shared palette keys
  _: null,
  k: '#16131f', // outline / dark
  s: '#2a2440', // shadow
};

function spr(rows, palette) {
  return { rows, w: rows[0].length, h: rows.length, palette: { ...P, ...palette } };
}

export const SPRITES = {
  hero: spr([
    '....kkkk....',
    '...kbbbbk...',
    '..kbffffbk..',
    '..kfwwwwfk..',
    '..kfewwefk..',
    '..kffwwffk..',
    '...kffffk...',
    '..krrrrrrk..',
    '.krrggggrrk.',
    '.kr gggg rk.',
    '..k hh hh k.',
    '...kk..kk...',
  ], { b: '#7b4a2d', f: '#e8b48a', w: '#f2d2b0', e: '#1a1330', r: '#3a6ea5', g: '#4f8fd0', h: '#5b4636' }),

  slime: spr([
    '............',
    '....gggg....',
    '..gghhhhgg..',
    '.ghhhhhhhhg.',
    '.ghhwwhhwhg.',
    '.ghhkkhhkhg.',
    '.ghhhhhhhhg.',
    '.ghhhhhhhhg.',
    'gghhhhhhhhgg',
    'gggggggggggg',
    '.kk.kk.kk.k.',
    '............',
  ], { g: '#2f8f4f', h: '#46c46e', w: '#d8ffe6', k: '#0c2a14' }),

  bat: spr([
    '............',
    '.k........k.',
    'kwk......kwk',
    'kwwk....kwwk',
    'kwwwkkkkwwwk',
    '.kwwwppwwwk.',
    '..kwprrpwk..',
    '...kpkkpk...',
    '....kkkk....',
    '............',
    '............',
    '............',
  ], { w: '#6b6b8a', p: '#9a3b5a', r: '#ff5a7a', k: '#16131f' }),

  skeleton: spr([
    '....kkkk....',
    '...kwwwwk...',
    '..kwkwwkwk..',
    '..kwwwwwwk..',
    '...kwkkwk...',
    '....kwwk....',
    '..kkwwwwkk..',
    '.kwk wwk wk.',
    '.kw kwwk wk.',
    '...kw..wk...',
    '..kw....wk..',
    '..kk....kk..',
  ], { w: '#e8e8d8', k: '#2a2622' }),

  mage: spr([
    '....pppp....',
    '...pkkkkp...',
    '..pkffffkp..',
    '..pffeefp p.',
    '..pffffp.cp.',
    '...pmmp..c..',
    '..pmmmmp.c..',
    '.pmmmmmmp...',
    '.pmwwwwmp...',
    '.pmmmmmmp...',
    '..pp..pp....',
    '............',
  ], { p: '#5b2d7a', f: '#e8b48a', e: '#1a1330', m: '#7b3fb0', w: '#c98fff', c: '#ffd24a' }),

  shard: spr([
    '....cc....',
    '...cwwc...',
    '..cwwwwc..',
    '.cwwwwwwc.',
    'cwwwCCwwwc',
    '.cwwwwwwc.',
    '..cwwwwc..',
    '...cwwc...',
    '....cc....',
    '..........',
  ], { c: '#6fe0ff', w: '#bff4ff', C: '#ffffff' }),

  chest: spr([
    '..........',
    '.kkkkkkkk.',
    '.kbyyyybk.',
    '.kbyyyybk.',
    '.kkkkkkkk.',
    '.kbbggbbk.',
    '.kbbggbbk.',
    '.kkkkkkkk.',
    '..........',
    '..........',
  ], { k: '#3a2410', b: '#7a4a1e', y: '#c98a3a', g: '#ffd24a' }),

  spider: spr([
    '............',
    '.k.......k..',
    '..k.....k...',
    'k.kk.kk.kk.k',
    '.kkwwwwwwkk.',
    '.kwwrwwrwwk.',
    '.kwwwwwwwwk.',
    '.kkwwwwwwkk.',
    'k.kk.kk.kk.k',
    '..k.....k...',
    '.k.......k..',
    '............',
  ], { w: '#4a3a5e', r: '#ff5a5a' }),

  spitter: spr([
    '............',
    '....gggg....',
    '..gghhhhgg..',
    '.ghhYwwYhhg.',
    '.ghhwkkwhhg.',
    '.ghhhhhhhhg.',
    '.gghhhhhhgg.',
    '..gaaaaaag..',
    '...a.a.a.a..',
    '............',
    '............',
    '............',
  ], { g: '#2f7f3a', h: '#5fd16b', Y: '#ffd24a', w: '#ffffff', a: '#9affb0', k: '#0c2a14' }),

  brute: spr([
    '...kkkk.....',
    '..kwwwwk....',
    '..kwffwk....',
    '..kwwwwk....',
    '.kkwwwwkk...',
    'kbbwwwwbbk..',
    'kbbwwwwbbk..',
    '.kwwwwwwk...',
    '..kw..wk....',
    '..kw..wk....',
    '..kk..kk....',
    '............',
  ], { w: '#8a8a96', f: '#2e2e38', b: '#62626e' }),

  cultist: spr([
    '....pppp....',
    '...pkkkkp...',
    '..pkrkkrkp..',
    '..pkkkkkkp..',
    '..pppppppp..',
    '..pmmmmmmp..',
    '..pmmwwmmp..',
    '..pmmmmmmp..',
    '..pmmmmmmp..',
    '..pp.mm.pp..',
    '...p.mm.p...',
    '............',
  ], { p: '#4a2466', m: '#7b3fb0', r: '#ff4a4a', w: '#ffd24a' }),

  wraith: spr([
    '....kk......',
    '...kwwk.....',
    '..kwwwwk....',
    '..kwrwrk....',
    '..kwwwwk....',
    '..kwwwwk....',
    '.kwwwwwwk...',
    '.kwwwwwwk...',
    '.kwwwwwwk...',
    '..kw.w.wk...',
    '...k.w.k....',
    '....k.k.....',
  ], { w: '#8fb0e0', r: '#d8f4ff' }),

  knight: spr([
    '....kkkk....',
    '...kCCCCk...',
    '..kCrCCrCk..',
    '..kCCCCCCk..',
    '..kkCCCCkk..',
    '.kSCCCCCCSk.',
    '.kSCCCCCCSk.',
    '..kCCCCCCk..',
    '..kC.CC.Ck..',
    '..kC.CC.Ck..',
    '..kk.CC.kk..',
    '.....kk.....',
  ], { C: '#aab0c4', S: '#6a7088', r: '#ff6a4a' }),

  drowned: spr([
    '....kkkk....',
    '...kggggk...',
    '..kgkggkgk..',
    '..kggggggk..',
    '...kgkkgk...',
    '....kggk....',
    '..kkggggkk..',
    '.kgkggggkgk.',
    '.kg.gggg.gk.',
    '...kg..gk...',
    '..kg....gk..',
    '..kk....kk..',
  ], { g: '#5a8f6a', k: '#16281c' }),

  archer: spr([
    '....kkkk....',
    '...kwwwwk...',
    '..kwkwwkwk..',
    '..kwwwwwwk..',
    '...kwkkwk...',
    '....kwwk.cc.',
    '..kkwwwwkc..',
    '.kwk.wwk.ck.',
    '.kw.kwwk.ck.',
    '...kw..wkcc.',
    '..kw....wk..',
    '..kk....kk..',
  ], { w: '#d8d0b8', c: '#9a6a2a', k: '#2a2622' }),

  merchant: spr([
    '....kkkk....',
    '...kyyyyk...',
    '..kyffffyk..',
    '..kfwwwwfk..',
    '..kfewwefk..',
    '...kffffk...',
    '..krrggrrk..',
    '.krrggggrrk.',
    '.kr gggg rk.',
    '..kbb..bbk..',
    '..kk....kk..',
    '............',
  ], { y: '#c98a3a', f: '#e8b48a', w: '#f2d2b0', e: '#1a1330', r: '#3a7a4a', g: '#4fae6a', b: '#5b4636', k: '#2a1c10' }),

  anvil: spr([
    '............',
    '...ff..ff...',
    '....ffff....',
    '..kkkkkkkk..',
    '.kwwwwwwwwk.',
    '.kwwwwwwwwk.',
    '..kkwwwwk...',
    '....kwwk....',
    '...kkkkkk...',
    '..kkkkkkkk..',
    '............',
    '............',
  ], { w: '#6a6f7e', k: '#1a1a22', f: '#ff8a2a' }),

  shrine: spr([
    '....cc....',
    '...cwwc...',
    '...cwwc...',
    '..ccwwcc..',
    '..cwCCwc..',
    '..cwCCwc..',
    '.ccwwwwcc.',
    '.cwwwwwwc.',
    '.cwwwwwwc.',
    'kkkkkkkkkk',
  ], { c: '#3a6a8a', w: '#6fe0ff', C: '#ffffff', k: '#1a1428' }),
};

// Bosses (larger, 16x16+)
export const BOSSES = {
  warden: spr([ // The Hollow Warden — armored knight
    '......kkkk......',
    '.....kwwwwk.....',
    '....kwrrrrwk....',
    '....kwrwwrwk....',
    '....kwwwwwwk....',
    '...kkwwwwwwkk...',
    '..kwwkwwwwkwwk..',
    '.kwwwwkwwkwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwrrwwwwrrwwk.',
    '..kwwwwwwwwwwk..',
    '...kwwwwwwwwk...',
    '...kw.kwwk.wk...',
    '...kw.kwwk.wk...',
    '...kk.kkkk.kk...',
    '................',
  ], { w: '#9aa0b8', r: '#ff4a4a', k: '#14111a' }),

  broodmother: spr([ // The Brood Mother — spider/slime queen
    '................',
    '..k..k..k..k....',
    '.kwk.kwk.kwk.k..',
    '.kw.kwwwwk.wk...',
    '..kwwwGGwwwk....',
    '.kwwGGGGGGwwk...',
    'kwwGGwwwwGGwwk..',
    'kwGGwwrrwwGGwk..',
    'kwGGwwrrwwGGwk..',
    'kwwGGwwwwGGwwk..',
    '.kwwGGGGGGwwk...',
    '..kwwGGGGwwk....',
    '...kwwwwwwk.....',
    '..kw.kwwk.wk....',
    '..kk.kkkk.kk....',
    '................',
  ], { w: '#4a2a5a', G: '#9a3fc0', r: '#ff6a2a', k: '#120a18' }),

  tidewrought: spr([ // The Tidewrought — drowned leviathan
    '......kkkk......',
    '....kkwwwwkk....',
    '...kwwWWWWwwk...',
    '..kwwWwwwwWwwk..',
    '..kwWwrwwrwWwk..',
    '..kwwWwwwwWwwk..',
    '.kwwwWWWWWWwwwk.',
    '.kwwwwwwwwwwwwk.',
    'kwwWwwwwwwwwWwwk',
    'kwWwwwwwwwwwwWwk',
    'kwwwwWWWWWWwwwwk',
    '.kwwwwwwwwwwwwk.',
    '..kwwk.kk.kwwk..',
    '..kwk..kk..kwk..',
    '..kk...kk...kk..',
    '.......kk.......',
  ], { w: '#2f7e92', W: '#6fd0e0', r: '#ffd24a', k: '#0a2630' }),

  ashenchoir: spr([ // The Ashen Choir — burning conclave
    '......ffff......',
    '....ffyyyyff....',
    '...fyy....yyf...',
    '...fy.kkkk.yf...',
    '..fy.kwwwwk.yf..',
    '..f.kwrwwrwk.f..',
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '...pppppppppp...',
    '..pp.fff.fff.pp.',
    '..ppffyffyffpp..',
    '..ppffyffyffpp..',
    '..pp.fff.fff.pp.',
    '...pp......pp...',
    '....pp....pp....',
    '.....p....p.....',
  ], { p: '#3a1a1a', f: '#ff7a2a', y: '#ffd24a', w: '#ffe9a0', r: '#ff3a3a', k: '#140808' }),

  hollowking: spr([ // The Hollow King — crowned wraith, final boss
    '......kkkk......',
    '....k cyyc k....',
    '...kcyyyyyyck...',
    '...kkkkkkkkkk...',
    '..kpppwwwwpppk..',
    '.kppwwCCCCwwppk.',
    '.kpwwCrrrCwwpk..',
    '.kpwCrrwwrrCwpk.',
    '.kpwCrwwwwrCwpk.',
    '.kpwwCrrrrCwwpk.',
    '.kppwwCCCCwwppk.',
    '..kpppwwwwpppk..',
    '...kpwwwwwwpk...',
    '...kp.kkkk.pk...',
    '...kk.k..k.kk...',
    '......k..k......',
  ], { p: '#2a1a3a', w: '#6a4a8a', C: '#c98fff', r: '#ff3a6a', y: '#ffd24a', c: '#ffe98a', k: '#0a0610' }),
};

// Draw a sprite grid. flipX mirrors horizontally. tint overrides every visible px.
export function drawSprite(ctx, sprite, x, y, scale = 1, flipX = false, tint = null) {
  const { rows, palette } = sprite;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const col = tint || palette[ch];
      if (!col) continue;
      const px = flipX ? (row.length - 1 - c) : c;
      ctx.fillStyle = col;
      ctx.fillRect(Math.floor(x + px * scale), Math.floor(y + r * scale), Math.ceil(scale), Math.ceil(scale));
    }
  }
}

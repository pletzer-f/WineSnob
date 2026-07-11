// WineSnob — engraved-style region vignettes, in the brand's line-art voice
// (fine strokes, no photography). Used wherever a licensed estate photograph
// does not exist: the art says "this place", never pretends to be a photo.

export type RegionArtKey =
  | 'bordeaux'
  | 'burgundy'
  | 'champagne'
  | 'rhone'
  | 'loire'
  | 'piedmont'
  | 'tuscany'
  | 'south-italy'
  | 'river-steep'
  | 'vine'

const MATCHERS: [RegExp, RegionArtKey][] = [
  [/bordeaux|m[ée]doc|margaux|pauillac|est[èe]phe|julien|pessac|graves|pomerol|[ée]milion|sauternes|haut-m/, 'bordeaux'],
  [/burgund|bourgogne|chablis|beaune|gevrey|chambolle|vosne|meursault|puligny|chassagne|c[ôo]te d/, 'burgundy'],
  [/champagne/, 'champagne'],
  [/rh[ôo]ne|hermitage|r[ôo]tie|ch[âa]teauneuf|condrieu|gigondas|cornas/, 'rhone'],
  [/loire|sancerre|vouvray|chinon|pouilly/, 'loire'],
  [/piedmont|piemonte|barolo|barbaresco|langhe|alba|barbera|nebbiolo/, 'piedmont'],
  [/tuscany|toscana|chianti|montalcino|bolgheri|brunello|maremma/, 'tuscany'],
  [/puglia|salento|sicil|campania|abruzzo|basilicata|etna/, 'south-italy'],
  [/mosel|rheingau|pfalz|nahe|rheinhessen|wachau|kamptal|germany|austria|douro/, 'river-steep'],
]

export function regionArtKey(area?: string, region?: string, country?: string): RegionArtKey {
  const hay = `${area || ''} ${region || ''} ${country || ''}`.toLowerCase()
  for (const [re, key] of MATCHERS) if (re.test(hay)) return key
  return 'vine'
}

/** One vignette, 16:9, strokes in currentColor. Size and tint via the parent. */
export function RegionArt({ area, region, country, style }: { area?: string; region?: string; country?: string; style?: React.CSSProperties }) {
  const key = regionArtKey(area, region, country)
  return (
    <svg
      viewBox="0 0 320 180"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
      aria-hidden
    >
      {ART[key]}
    </svg>
  )
}

const ART: Record<RegionArtKey, React.ReactNode> = {
  // A Médoc château: hipped roof, twin turrets, vine rows in the foreground.
  bordeaux: (
    <>
      <path d="M10 133h300" opacity=".45" />
      <path d="M127 133V76h66v57" />
      <path d="M122 76l38-20 39 20" />
      <path d="M160 56v-8" />
      <path d="M112 133V84h15M193 133V84h15" />
      <path d="M107 84l12.5-21L132 84M188 84l12.5-21L213 84" />
      <path d="M119.5 63v-6M200.5 63v-6" />
      <path d="M140 96h9v16h-9zM171 96h9v16h-9z" />
      <path d="M155 133v-14a5 5 0 0 1 10 0v14" />
      <path d="M16 172q70-26 128-30M304 172q-64-26-122-30" opacity=".8" />
      <path d="M34 178q62-28 122-34M286 178q-56-28-118-34" opacity=".55" />
      <path d="M60 164v-8M104 152v-8M150 145v-8M216 152v-8M262 164v-8" opacity=".8" />
    </>
  ),
  // A Burgundian clos: the wall, its arched gate, one tree on the rise.
  burgundy: (
    <>
      <path d="M8 96q86-38 150-38t154 44" opacity=".5" />
      <path d="M12 134h296" />
      <path d="M12 116h120M188 116h120" />
      <path d="M132 134v-18a24 24 0 0 1 56 0v18" />
      <path d="M155 116a5 5 0 0 1 10 0" opacity=".8" />
      <path d="M40 116v18M76 116v18M112 116v18M208 116v18M244 116v18M280 116v18" opacity=".45" />
      <path d="M236 58v-20" />
      <path d="M236 40c-13 2-20-4-21-14 12-2 20 4 21 14zM236 42c12 1 19-4 20-14-11-2-19 4-20 14z" />
      <path d="M28 152h264M46 166h228" opacity=".5" />
      <path d="M70 152v-7M130 152v-7M190 152v-7M250 152v-7" opacity=".7" />
    </>
  ),
  // Chalk cellars: receding vaults, bottles resting sur lattes.
  champagne: (
    <>
      <path d="M38 168V96a122 92 0 0 1 244 0v72" />
      <path d="M70 168V104a90 68 0 0 1 180 0v64" opacity=".7" />
      <path d="M102 168v-56a58 46 0 0 1 116 0v56" opacity=".5" />
      <path d="M134 168v-46a26 24 0 0 1 52 0v46" opacity=".35" />
      <path d="M26 168h268" />
      <circle cx="56" cy="150" r="6" /><circle cx="70" cy="150" r="6" /><circle cx="84" cy="150" r="6" />
      <circle cx="63" cy="139" r="6" /><circle cx="77" cy="139" r="6" />
      <circle cx="70" cy="128" r="6" />
      <circle cx="56" cy="150" r="2" opacity=".7" /><circle cx="70" cy="150" r="2" opacity=".7" /><circle cx="84" cy="150" r="2" opacity=".7" />
      <circle cx="63" cy="139" r="2" opacity=".7" /><circle cx="77" cy="139" r="2" opacity=".7" />
      <circle cx="70" cy="128" r="2" opacity=".7" />
    </>
  ),
  // The northern Rhône: terraces stepping up to the chapel.
  rhone: (
    <>
      <circle cx="272" cy="40" r="13" opacity=".6" />
      <path d="M8 168L232 40" opacity=".4" />
      <path d="M24 160l56-32M96 119l44-25M156 85l32-18" />
      <path d="M24 160v8h44M96 119v8h36M156 85v8h28" opacity=".7" />
      <path d="M40 160v-6M62 148v-6M112 112v-6M134 100v-6M170 78v-6" opacity=".8" />
      <path d="M216 52v-18h20v18" />
      <path d="M212 34l14-10 14 10" />
      <path d="M226 24v-8M222 20h8" />
      <path d="M8 176h304" opacity=".5" />
    </>
  ),
  // A Loire château on its river: slim turrets, water, a willow.
  loire: (
    <>
      <path d="M118 118V72h84v46" />
      <path d="M112 72h96" opacity=".7" />
      <path d="M104 118V64h14M202 118V64h14" />
      <path d="M99 64l12-20 12 20M197 64l12-20 12 20" />
      <path d="M111 44v-7M209 44v-7" />
      <path d="M146 84h8v14h-8zM166 84h8v14h-8z" />
      <path d="M8 130q40 8 80 8t72-8 72-8 80 8" opacity=".7" />
      <path d="M20 148q44 10 84 6M216 148q44 6 84-2" opacity=".45" />
      <path d="M120 152h32M176 158h44" opacity=".35" />
      <path d="M44 118V84" />
      <path d="M44 84q-20 6-26 26M44 84q-2 22-14 34M44 84q10 22 4 38M44 84q22 8 26 30" opacity=".7" />
    </>
  ),
  // The Langhe: fog bands, layered hills, a village tower on the crest.
  piedmont: (
    <>
      <path d="M8 120q60-52 130-52 82 0 174 56" opacity=".55" />
      <path d="M8 150q80-44 160-40 84 4 144 34" opacity=".35" />
      <path d="M20 92h56M92 84h44M250 96h48" opacity=".3" />
      <path d="M196 78V46h18v32" />
      <path d="M193 46h24M196 46v-6h4v6M206 46v-6h4v6M216 46v-6h4v6" />
      <path d="M180 82h52" opacity=".6" />
      <path d="M16 176q76-26 140-28M304 176q-58-24-122-28" opacity=".8" />
      <path d="M56 166v-8M112 154v-8M160 149v-8M222 156v-8M270 166v-8" opacity=".8" />
    </>
  ),
  // Tuscany: the cypress road climbing to a villa.
  tuscany: (
    <>
      <path d="M8 126q70-30 150-30t154 34" opacity=".5" />
      <path d="M20 178q60-8 96-28t54-44" opacity=".7" />
      <path d="M64 178q52-14 84-34" opacity=".4" />
      <path d="M196 100V74h34v26" />
      <path d="M192 74h42M204 74v-16h18v16" />
      <path d="M210 88h6v12h-6z" opacity=".8" />
      <path d="M60 142c0-16 5-30 9-30s9 14 9 30c0 8-4 12-9 12s-9-4-9-12zM69 154v10" />
      <path d="M110 122c0-13 4-24 7.5-24s7.5 11 7.5 24c0 7-3.5 10-7.5 10s-7.5-3-7.5-10zM117.5 132v9" />
      <path d="M152 104c0-11 3.5-20 6.5-20s6.5 9 6.5 20c0 6-3 9-6.5 9s-6.5-3-6.5-9zM158.5 113v8" />
    </>
  ),
  // The south: a trullo, an alberello bush vine, the low stone wall.
  'south-italy': (
    <>
      <path d="M8 140h304" opacity=".45" />
      <path d="M96 140v-34h64v34" />
      <path d="M88 106h80" />
      <path d="M94 106l34-44 34 44" opacity=".9" />
      <circle cx="128" cy="56" r="3" />
      <path d="M120 122a8 8 0 0 1 16 0v18" opacity=".8" />
      <path d="M228 140v-26" />
      <path d="M228 114q-16-2-22-14 14-4 22 6zM228 114q16-2 22-14-14-4-22 6zM228 106q-2-14 6-24 8 8 2 22z" opacity=".75" />
      <path d="M22 156h276M40 168h240" opacity=".4" />
      <path d="M64 156v-6M120 156v-6M180 156v-6M240 156v-6" opacity=".6" />
    </>
  ),
  // Steep river vineyards: Mosel, Wachau, the Douro.
  'river-steep': (
    <>
      <path d="M8 30L232 148" opacity=".5" />
      <path d="M30 48l36 20M64 34l40 22M120 52l40 22M160 72l44 24M204 96l36 20" opacity=".75" />
      <path d="M44 42v14M84 46v14M144 66v14M188 86v14M228 108v14" opacity=".5" />
      <path d="M8 156q60 -14 120 -8t114 18 70 4" />
      <path d="M40 168q52-8 104-2M200 174q48 6 92-2" opacity=".45" />
      <path d="M262 138q10 8 24 8l6-8" opacity=".8" />
    </>
  ),
  // The fallback: a vine sprig with its cluster and tendril.
  vine: (
    <>
      <path d="M40 150Q120 120 190 84t76-50" />
      <path d="M120 118q-14-26-40-30 4 30 32 36zM172 92q0-30-22-44-8 28 14 48z" opacity=".8" />
      <path d="M212 66q26-12 30-38-30 2-38 30z" opacity=".8" />
      <circle cx="150" cy="120" r="7" /><circle cx="165" cy="126" r="7" /><circle cx="180" cy="120" r="7" />
      <circle cx="157" cy="133" r="7" /><circle cx="172" cy="133" r="7" />
      <circle cx="165" cy="146" r="7" />
      <path d="M236 46q14-4 16 6t-8 12-12-6 8-10" opacity=".7" />
    </>
  ),
}

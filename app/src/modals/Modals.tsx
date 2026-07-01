import { useMemo } from 'react'
import { Modal, Button, TextField, TextArea, Select, Switch } from 'winesnob-design-system'
import { useStore } from '@/store/store'
import { scopedBottles } from '@/store/selectors'
import { OCCASIONS } from '@/domain/occasions'
import { bottleValue } from '@/domain/valuation'
import { todayISO } from '@/lib/date'
import { useMoney } from '@/lib/useMoney'
import { hasSupabase, supabase } from '@/lib/supabase'

const STAT_OPTIONS = [
  { key: 'bottles', label: 'Bottles', desc: 'Total bottles held' },
  { key: 'value', label: 'Cellar value', desc: 'Estimated market value' },
  { key: 'ready', label: 'Ready to drink', desc: 'Bottles in their window' },
  { key: 'regions', label: 'Regions', desc: 'Distinct regions' },
  { key: 'cellaring', label: 'Cellaring', desc: 'Still maturing' },
  { key: 'topRegion', label: 'Top region', desc: 'Most valuable region' },
  { key: 'avgVintage', label: 'Avg vintage', desc: 'Average vintage year' },
  { key: 'avgScore', label: 'Avg score', desc: 'Average critic score' },
]

const LOG_STAT_OPTIONS = [
  { key: 'opened', label: 'Bottles opened', desc: 'Bottles you opened this year' },
  { key: 'allTime', label: 'Opened all time', desc: 'Every pour you’ve logged' },
  { key: 'volume', label: 'Volume enjoyed', desc: 'How much wine you drank this year' },
  { key: 'regions', label: 'Regions explored', desc: 'Distinct regions this year' },
  { key: 'fav', label: 'Favourite region', desc: 'Where you drank the most' },
  { key: 'top', label: 'Best in glass', desc: 'Your highest-rated pour this year' },
  { key: 'avg', label: 'Average rating', desc: 'Mean stars this year' },
  { key: 'occasion', label: 'Top occasion', desc: 'How you drink most often' },
  { key: 'reds', label: 'Reds vs whites', desc: 'This year’s split' },
  { key: 'buyagain', label: 'To buy again', desc: 'Wines you’d happily repeat' },
]

const OCCASION_OPTIONS = [
  { label: 'Dinner', value: 'dinner' },
  { label: 'Celebration', value: 'celebration' },
  { label: 'Everyday', value: 'everyday' },
  { label: 'At a restaurant', value: 'restaurant' },
  { label: 'Gift given', value: 'gift-given' },
  { label: 'Tasting', value: 'tasting' },
]

const WISH_PRIORITY_OPTIONS = [
  { label: 'Grail — must-have', value: 'grail' },
  { label: 'High priority', value: 'high' },
  { label: 'Someday', value: 'medium' },
]

export function Modals() {
  return (
    <>
      <StatsPicker />
      <LogStatsPicker />
      <CellarSwitch />
      <ManageCellars />
      <Recommend />
      <CollectionEditor />
      <AddToCollection />
      <WishEditor />
      <DrinkLog />
      <AccountModal />
      <SignOut />
    </>
  )
}

function pickerRow(desc: string) {
  return { fontSize: 13, color: 'var(--ws-muted)', marginTop: 2 } as React.CSSProperties
}

function StatsPicker() {
  const s = useStore()
  return (
    <Modal open={s.statsModal} title="Cellar summary" onClose={s.closeStats} footer={<Button variant="primary" onClick={s.closeStats}>Done</Button>}>
      <div style={{ fontSize: 14, color: 'var(--ws-muted)', margin: '-4px 0 4px' }}>
        Choose up to six metrics for your cellar summary. {s.statKeys.length} of 6 selected.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {STAT_OPTIONS.map((opt) => {
          const on = s.statKeys.includes(opt.key)
          return (
            <div key={opt.key} style={rowStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, color: 'var(--ws-ink)' }}>{opt.label}</div>
                <div style={pickerRow(opt.desc)}>{opt.desc}</div>
              </div>
              <Switch checked={on} disabled={!on && s.statKeys.length >= 6} onChange={(c) => s.toggleStat(opt.key, c)} label={opt.label} />
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function LogStatsPicker() {
  const s = useStore()
  return (
    <Modal open={s.logStatsModal} title="Your year in wine" onClose={s.closeLogStats} footer={<Button variant="primary" onClick={s.closeLogStats}>Done</Button>}>
      <div style={{ fontSize: 14, color: 'var(--ws-muted)', margin: '-4px 0 4px' }}>
        Choose up to six figures for your year in wine. {s.logStatKeys.length} of 6 selected.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {LOG_STAT_OPTIONS.map((opt) => {
          const on = s.logStatKeys.includes(opt.key)
          return (
            <div key={opt.key} style={rowStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, color: 'var(--ws-ink)' }}>{opt.label}</div>
                <div style={pickerRow(opt.desc)}>{opt.desc}</div>
              </div>
              <Switch checked={on} disabled={!on && s.logStatKeys.length >= 6} onChange={(c) => s.toggleLogStat(opt.key, c)} label={opt.label} />
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function CellarSwitch() {
  const s = useStore()
  const count = (id: string) => s.bottles.filter((b) => (b.cellarId || 'main') === id).reduce((a, b) => a + b.quantity, 0)
  const totalAll = s.bottles.reduce((a, b) => a + b.quantity, 0)
  return (
    <Modal open={s.cellarSwitchOpen} title="Your cellars" onClose={s.closeCellarSwitch}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <button className="ws-fade" onClick={s.selectAllCellars} style={rowBtn}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--ws-font-display)', fontSize: 18, color: 'var(--ws-ink)' }}>All cellars</span>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--ws-muted)', marginTop: 2 }}>{`${totalAll} bottles across ${s.cellars.length} cellars`}</span>
          </span>
          {s.activeCellar === 'all' && <span style={{ color: 'var(--ws-bordeaux)', fontSize: 16 }}>✓</span>}
        </button>
        {s.cellars.map((c) => {
          const n = count(c.id)
          return (
            <button key={c.id} className="ws-fade" onClick={() => s.setActiveCellar(c.id)} style={rowBtn}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--ws-font-display)', fontSize: 18, color: 'var(--ws-ink)' }}>{c.name}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--ws-muted)', marginTop: 2 }}>{`${n} ${n === 1 ? 'bottle' : 'bottles'}`}</span>
              </span>
              {s.activeCellar === c.id && <span style={{ color: 'var(--ws-bordeaux)', fontSize: 16 }}>✓</span>}
            </button>
          )
        })}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-4)', marginTop: 'var(--ws-space-3)' }}>
          <Button variant="secondary" onClick={s.openCellarManage}>
            Manage cellars
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ManageCellars() {
  const s = useStore()
  const count = (id: string) => s.bottles.filter((b) => (b.cellarId || 'main') === id).reduce((a, b) => a + b.quantity, 0)
  const canRemove = s.cellars.length > 1
  const canAdd = s.cellars.length < 3
  return (
    <Modal open={s.cellarManageOpen} title="Manage cellars" onClose={s.closeCellarManage}>
      <div style={{ fontSize: 14, color: 'var(--ws-muted)', margin: '-4px 0 8px' }}>
        Name, add, or remove cellars. Up to three for now. Removing a cellar moves its bottles into your first one.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
        {s.cellars.map((c) => {
          const n = count(c.id)
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--ws-space-3)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextField label="Cellar name" value={c.name} onChange={(e) => s.renameCellar(c.id, e.target.value)} hint={`${n} ${n === 1 ? 'bottle' : 'bottles'}`} />
              </div>
              {canRemove && (
                <button className="ws-danger-hover" onClick={() => s.removeCellar(c.id)} aria-label="Remove cellar" style={{ flex: 'none', height: 44, padding: '0 14px', borderRadius: 'var(--ws-radius-md)', border: '0.5px solid var(--ws-border)', background: 'none', cursor: 'pointer', color: 'var(--ws-muted)', font: 'inherit', fontSize: 13 }}>
                  Remove
                </button>
              )}
            </div>
          )
        })}
        {canAdd && (
          <button onClick={s.addCellar} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: '0.5px dashed var(--ws-border-strong)', borderRadius: 'var(--ws-radius-md)', cursor: 'pointer', font: 'inherit', fontSize: 14, color: 'var(--ws-bordeaux)', padding: '10px 16px' }}>
            + Add a cellar
          </button>
        )}
      </div>
    </Modal>
  )
}

function Recommend() {
  const s = useStore()
  const money = useMoney()
  const cellar = useMemo(() => scopedBottles(s), [s.bottles, s.activeCellar])
  const occKey = s.occasion || 'dinner'
  const occDef = OCCASIONS.find((o) => o.key === occKey) || OCCASIONS[0]
  const recs = cellar
    .filter(occDef.match)
    .slice()
    .sort((a, b) => occDef.rank(b) - occDef.rank(a))
    .slice(0, 3)

  return (
    <Modal open={s.recommendOpen} title="Recommend a bottle" onClose={s.closeRecommend}>
      <div style={{ fontSize: 14, color: 'var(--ws-muted)', margin: '-4px 0 14px' }}>Tell us the occasion and we’ll pull a few from your own cellar.</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--ws-space-5)' }}>
        {OCCASIONS.map((o) => {
          const active = o.key === occKey
          return (
            <button
              key={o.key}
              onClick={() => s.setOccasion(o.key)}
              style={{
                font: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
                borderRadius: 999,
                padding: '8px 15px',
                border: `0.5px solid ${active ? 'var(--ws-bordeaux)' : 'var(--ws-border)'}`,
                background: active ? 'var(--ws-bordeaux)' : 'transparent',
                color: active ? 'var(--ws-bg)' : 'var(--ws-muted)',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ws-muted)', fontStyle: 'italic', marginBottom: 12 }}>{occDef.blurb}</div>
      {recs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-3)' }}>
          {recs.map((b) => (
            <button
              key={b.id}
              className="ws-hairline-btn"
              onClick={() => {
                s.closeRecommend()
                s.openBottle(b)
              }}
              style={{ textAlign: 'left', font: 'inherit', cursor: 'pointer', background: 'var(--ws-alabaster)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-md)', padding: 'var(--ws-space-4)', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--ws-space-3)' }}>
                <div style={{ fontFamily: 'var(--ws-font-display)', fontSize: 17, color: 'var(--ws-ink)', minWidth: 0 }}>
                  {b.name} <span style={{ color: 'var(--ws-muted)', fontSize: 14 }}>{String(b.vintage)}</span>
                </div>
                <div style={{ flex: 'none', fontSize: 14, color: 'var(--ws-ink)', whiteSpace: 'nowrap' }}>{money(bottleValue(b))}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ws-muted)' }}>
                {b.producer} · {b.region}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ws-ink)', opacity: 0.82, lineHeight: 1.5 }}>{occDef.reason(b, money)}</div>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 'var(--ws-space-5)', color: 'var(--ws-muted)', fontSize: 14 }}>Nothing in your cellar quite fits that just now. Try another occasion.</div>
      )}
    </Modal>
  )
}

function CollectionEditor() {
  const s = useStore()
  const cellar = useMemo(() => scopedBottles(s), [s.bottles, s.activeCellar])
  const checklist = cellar.slice().sort((a, b) => a.name.localeCompare(b.name))
  const chosen = s.collForm.ids.length
  return (
    <Modal open={s.collEditOpen} title={s.collEditId ? 'Edit collection' : 'New collection'} onClose={s.closeCollEdit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
        <TextField label="Collection name" placeholder="e.g. Christmas dinner" value={s.collForm.title} onChange={(e) => s.setCollField('title', e.target.value)} error={s.collForm.error ? 'Give the collection a name.' : undefined} />
        <TextField label="Description" placeholder="What’s this collection for?" value={s.collForm.desc} onChange={(e) => s.setCollField('desc', e.target.value)} />
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--ws-space-3)', marginBottom: 9 }}>
            <div style={miniLabel}>Bottles in this collection</div>
            <div style={{ fontSize: 13, color: 'var(--ws-muted)' }}>{`${chosen} ${chosen === 1 ? 'bottle' : 'bottles'} selected`}</div>
          </div>
          <div style={{ maxHeight: 264, overflow: 'auto', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-md)' }}>
            {checklist.map((b) => {
              const on = s.collForm.ids.includes(b.id)
              return (
                <button key={b.id} className="ws-fade" onClick={() => s.toggleCollMember(b.id)} style={{ width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer', background: 'none', border: 0, borderTop: '0.5px solid var(--ws-border)', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={on ? checkOn : checkOff}>{on ? '✓' : ''}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--ws-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.name} <span style={{ color: 'var(--ws-muted)' }}>{String(b.vintage)}</span>
                  </span>
                  <span style={{ flex: 'none', fontSize: 12, color: 'var(--ws-muted)' }}>{b.region}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center', marginTop: 'var(--ws-space-2)', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-4)' }}>
          {s.collEditId && (
            <Button variant="ghost" onClick={s.deleteCollection}>
              Delete
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={s.closeCollEdit}>
            Cancel
          </Button>
          <Button variant="primary" onClick={s.saveCollection}>
            {s.collEditId ? 'Save collection' : 'Create collection'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AddToCollection() {
  const s = useStore()
  const bottle = s.bottles.find((b) => b.id === s.addToCollBottleId) || null
  return (
    <Modal open={s.addToCollOpen} title="Add to collection" onClose={s.closeAddToColl}>
      <div style={{ fontSize: 14, color: 'var(--ws-muted)', margin: '-4px 0 14px' }}>
        Add <strong style={{ color: 'var(--ws-ink)', fontWeight: 600 }}>{bottle ? bottle.name : ''}</strong> to one of your collections.
      </div>
      {s.customCollections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {s.customCollections.map((c) => {
            const on = bottle ? c.ids.includes(bottle.id) : false
            return (
              <button key={c.id} className="ws-hairline-btn" onClick={() => s.toggleBottleInColl(c.id)} style={{ width: '100%', textAlign: 'left', font: 'inherit', cursor: 'pointer', background: 'var(--ws-alabaster)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={on ? checkOn : checkOff}>{on ? '✓' : ''}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--ws-ink)' }}>{c.title}</span>
                <span style={{ flex: 'none', fontSize: 12, color: 'var(--ws-muted)' }}>{`${c.ids.length} ${c.ids.length === 1 ? 'wine' : 'wines'}`}</span>
              </button>
            )
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center', marginTop: 'var(--ws-space-4)' }}>
        <Button variant="secondary" onClick={s.addToCollNew}>
          New collection…
        </Button>
        <div style={{ flex: 1 }} />
        <Button variant="primary" onClick={s.closeAddToColl}>
          Done
        </Button>
      </div>
    </Modal>
  )
}

function WishEditor() {
  const s = useStore()
  const wf = s.wishForm
  return (
    <Modal open={s.wishOpen} title={s.wishEditId ? 'Edit wish' : 'Add a wish'} onClose={s.closeWish}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
        <TextField label="Wine" placeholder="e.g. Hermitage La Chapelle" value={wf.name} onChange={(e) => s.setWishField('name', e.target.value)} error={wf.error ? 'Name the wine you’re after.' : undefined} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--ws-space-4)' }}>
          <TextField label="Producer" placeholder="e.g. Paul Jaboulet Aîné" value={wf.producer} onChange={(e) => s.setWishField('producer', e.target.value)} />
          <TextField label="Region" placeholder="e.g. Northern Rhône" value={wf.region} onChange={(e) => s.setWishField('region', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--ws-space-4)' }}>
          <TextField label="Vintage" placeholder="e.g. 2019 or NV" value={wf.vintage} onChange={(e) => s.setWishField('vintage', e.target.value)} />
          <TextField label="Target price" placeholder="e.g. 420" value={wf.targetPrice} onChange={(e) => s.setWishField('targetPrice', e.target.value)} hint="Leave blank for no target" />
          <Select label="Priority" options={WISH_PRIORITY_OPTIONS} value={wf.priority} onChange={(e) => s.setWishField('priority', e.target.value as typeof wf.priority)} />
        </div>
        <TextArea label="Note" placeholder="Why you’re after it, where to look, the occasion in mind…" value={wf.note} onChange={(e) => s.setWishField('note', e.target.value)} />
        <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center', marginTop: 'var(--ws-space-2)', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-4)' }}>
          {s.wishEditId && (
            <Button variant="ghost" onClick={s.deleteWish}>
              Delete
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={s.closeWish}>
            Cancel
          </Button>
          <Button variant="primary" onClick={s.saveWish}>
            {s.wishEditId ? 'Save wish' : 'Add to wishlist'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function DrinkLog() {
  const s = useStore()
  const df = s.drinkForm
  const bottle = s.bottles.find((b) => b.id === s.drinkLogId) || null
  return (
    <Modal open={s.drinkLogOpen} title="Log a pour" onClose={s.closeDrinkLog}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
        <div style={{ fontSize: 14, color: 'var(--ws-muted)', margin: '-4px 0 2px' }}>
          You’re opening a bottle of <span style={{ color: 'var(--ws-ink)', fontWeight: 500 }}>{bottle ? bottle.name : 'this wine'}</span>. Capture the moment, or just log it.
        </div>
        <div className="ws-form-2col">
          <div>
            <div style={miniLabel}>Date drunk</div>
            <input
              type="date"
              value={df.date || todayISO()}
              onChange={(e) => s.setDrinkField('date', e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: 15, color: 'var(--ws-ink)', background: 'var(--ws-alabaster)', border: '0.5px solid var(--ws-border)', borderRadius: 'var(--ws-radius-md)', padding: '11px 12px' }}
            />
          </div>
          <Select label="Occasion" options={OCCASION_OPTIONS} value={df.occasion} onChange={(e) => s.setDrinkField('occasion', e.target.value as typeof df.occasion)} />
        </div>
        <TextField label="Who you shared it with" placeholder="e.g. Priya & Tom, or just us" value={df.companions} onChange={(e) => s.setDrinkField('companions', e.target.value)} />
        <div>
          <div style={miniLabel}>How was it?</div>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => s.setDrinkField('rating', n === df.rating ? 0 : n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                style={{ width: 28, height: 28, padding: 0, border: 0, background: 'none', cursor: 'pointer', color: n <= df.rating ? 'var(--ws-bordeaux)' : 'var(--ws-border-strong)', fontSize: 24, lineHeight: 1 }}
              >
                {n <= df.rating ? '★' : '☆'}
              </button>
            ))}
          </div>
        </div>
        <TextArea label="Tasting note" placeholder="How it showed, what you ate, who was there…" value={df.note} onChange={(e) => s.setDrinkField('note', e.target.value)} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--ws-space-4)', padding: '12px 0 4px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, color: 'var(--ws-ink)' }}>I’d buy this again</div>
            <div style={{ fontSize: 13, color: 'var(--ws-muted)', marginTop: 2 }}>Adds it to your Buy again list</div>
          </div>
          <Switch checked={df.buyAgain} onChange={(c) => s.setDrinkField('buyAgain', c)} label="Buy again" />
        </div>
        <div className="ws-modal-actions" style={{ borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-4)' }}>
          <Button variant="ghost" onClick={s.quickDrink}>
            Just log it
          </Button>
          <div className="ws-modal-actions__spacer" />
          <Button variant="secondary" onClick={s.closeDrinkLog}>
            Cancel
          </Button>
          <Button variant="primary" onClick={s.saveDrink}>
            Log this pour
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AccountModal() {
  const s = useStore()
  const af = s.accountForm
  return (
    <Modal open={s.accountOpen} title="Manage account" onClose={s.closeAccount}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-4)' }}>
        <TextField label="Display name" placeholder="Your name" value={af.name} onChange={(e) => s.setAccountField('name', e.target.value)} />
        <TextField label="Email" placeholder="you@example.com" value={af.email} onChange={(e) => s.setAccountField('email', e.target.value)} />
        <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center', marginTop: 'var(--ws-space-2)', borderTop: '0.5px solid var(--ws-border)', paddingTop: 'var(--ws-space-4)' }}>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={s.closeAccount}>
            Cancel
          </Button>
          <Button variant="primary" onClick={s.saveAccount}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function SignOut() {
  const s = useStore()
  const confirm = async () => {
    s.closeSignOut()
    if (hasSupabase) await supabase.auth.signOut()
    s.onSignedOut()
    s.flash('Signed out')
  }
  return (
    <Modal open={s.signOutOpen} title="Sign out" onClose={s.closeSignOut}>
      <div style={{ fontSize: 15, color: 'var(--ws-ink)', lineHeight: 1.55, margin: '-4px 0 18px' }}>
        Sign out of WineSnob? Your cellar stays safe — you can sign back in any time.
      </div>
      <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'center' }}>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={s.closeSignOut}>
          Stay signed in
        </Button>
        <Button variant="primary" onClick={confirm}>
          Sign out
        </Button>
      </div>
    </Modal>
  )
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--ws-space-4)', padding: '12px 0', borderTop: '0.5px solid var(--ws-border)' }
const rowBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--ws-space-4)', textAlign: 'left', background: 'none', border: 0, borderTop: '0.5px solid var(--ws-border)', cursor: 'pointer', font: 'inherit', padding: 'var(--ws-space-4) 0' }
const miniLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ws-muted)', marginBottom: 8 }
const checkOn: React.CSSProperties = { flex: 'none', width: 19, height: 19, borderRadius: 5, background: 'var(--ws-bordeaux)', color: 'var(--ws-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }
const checkOff: React.CSSProperties = { flex: 'none', width: 19, height: 19, borderRadius: 5, border: '1px solid var(--ws-border-strong)', boxSizing: 'border-box' }

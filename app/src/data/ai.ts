import { hasSupabase, supabase } from '@/lib/supabase'
import type { RawRead } from '@/store/store'

/** Read wine labels from photos. Calls the `read-label` Edge Function when a
 * Supabase project is configured; otherwise returns demo reads so the flow is
 * fully explorable offline. */
export async function readLabels(files: File[], mode: 'label' | 'case' | 'voice'): Promise<RawRead[]> {
  if (hasSupabase && files.length) {
    const images = await Promise.all(files.map(fileToBase64))
    const { data, error } = await supabase.functions.invoke('read-label', {
      body: { images, mode },
    })
    if (error) throw error
    const reads = (data?.reads ?? []) as RawRead[]
    if (!reads.length) throw new Error('No wines were read from that photo.')
    return reads
  }
  return mode === 'case' ? caseBatch() : labelBatch()
}

/** Parse an uploaded cellar list (CSV / spreadsheet / PDF) into reads. */
export async function parseImport(file: File): Promise<RawRead[]> {
  if (hasSupabase) {
    const content = await fileToBase64(file)
    const { data, error } = await supabase.functions.invoke('parse-import', {
      body: { file: content, filename: file.name },
    })
    if (error) throw error
    return (data?.reads ?? []) as RawRead[]
  }
  return caseBatch()
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ---- demo reads (mirror the prototype's simulated OCR) ----
function labelBatch(): RawRead[] {
  return [{ name: 'Château Palmer', producer: 'Margaux', vintage: 2016, region: 'Margaux, Bordeaux', colour: 'red', confidence: 'high', unit: 320 }]
}

function caseBatch(): RawRead[] {
  return [
    { name: 'Châteauneuf-du-Pape', producer: 'Château de Beaucastel', vintage: 2019, region: 'Southern Rhône', colour: 'red', confidence: 'high', unit: 120 },
    { name: 'Gevrey-Chambertin 1er Cru', producer: 'Domaine Fourrier', vintage: 2020, region: 'Burgundy', colour: 'red', confidence: 'medium', unit: 180 },
    { name: 'Champagne: label unclear', producer: '', vintage: '?', region: 'Champagne', colour: 'sparkling', confidence: 'low', unit: 70 },
    { name: 'Condrieu La Doriane', producer: 'E. Guigal', vintage: 2021, region: 'Northern Rhône', colour: 'white', confidence: 'high', unit: 95 },
    { name: 'Sassicaia', producer: 'Tenuta San Guido', vintage: 2019, region: 'Bolgheri, Tuscany', colour: 'red', confidence: 'high', unit: 240 },
  ]
}

import type { Bottle, Cellar, CustomCollection, Drink, Wish } from '@/domain/types'

// Illustrative sample cellar from the prototype. Used for the local demo
// experience and as an optional "load sample cellar" for a new account.

export function seedCellars(): Cellar[] {
  return [
    { id: 'main', name: 'Main Cellar' },
    { id: 'rack', name: 'Weekday Rack' },
  ]
}

export function seedBottles(): Bottle[] {
  return [
    { id: 'margaux', cellarId: 'main', name: 'Château Margaux', producer: 'Premier Grand Cru Classé', vintage: 2015, region: 'Margaux', area: 'Bordeaux', country: 'France', colour: 'red', status: 'ready', quantity: 6, unit: 850, paid: 527, format: 'standard', grapes: ['Cabernet Sauvignon', 'Merlot', 'Petit Verdot'], score: 98, rating: 5, drinkFrom: 2025, drinkTo: 2050, note: 'Opulent yet precise: cassis, violet and graphite, with a finish that won’t quit. A landmark vintage.' },
    { id: 'margaux-mag', cellarId: 'main', name: 'Château Margaux', producer: 'Premier Grand Cru Classé', vintage: 2015, region: 'Margaux', area: 'Bordeaux', country: 'France', colour: 'red', status: 'ready', quantity: 2, unit: 850, paid: 468, format: 'magnum', grapes: ['Cabernet Sauvignon', 'Merlot', 'Petit Verdot'], score: 98, rating: 5, drinkFrom: 2025, drinkTo: 2050, note: 'Held in magnum for the long haul — the slower ageing keeps it fresher for years past the standard bottles.' },
    { id: 'margaux-jero', cellarId: 'main', name: 'Château Margaux', producer: 'Premier Grand Cru Classé', vintage: 2015, region: 'Margaux', area: 'Bordeaux', country: 'France', colour: 'red', status: 'cellaring', quantity: 1, unit: 850, paid: 595, format: 'jeroboam', grapes: ['Cabernet Sauvignon', 'Merlot', 'Petit Verdot'], score: 98, rating: 5, drinkFrom: 2025, drinkTo: 2050, note: 'A single jéroboam for a milestone. One day this pours for a table of twelve.' },
    { id: 'monfortino', cellarId: 'main', name: 'Barolo Monfortino Riserva', producer: 'Giacomo Conterno', vintage: 2017, region: 'Piedmont', area: 'Piedmont', country: 'Italy', colour: 'red', status: 'cellaring', quantity: 3, unit: 1150, paid: 552, format: 'magnum', grapes: ['Nebbiolo'], score: 99, rating: 5, drinkFrom: 2030, drinkTo: 2055, note: 'Tar and roses over monumental tannin. Decades away from its peak, leave it be.' },
    { id: 'cristal', cellarId: 'main', name: 'Cristal', producer: 'Louis Roederer', vintage: 2014, region: 'Champagne', area: 'Champagne', country: 'France', colour: 'sparkling', status: 'ready', quantity: 4, unit: 290, paid: 232, format: 'standard', grapes: ['Chardonnay', 'Pinot Noir'], score: 96, rating: 5, drinkFrom: 2024, drinkTo: 2034, note: 'Chalky tension, brioche and candied citrus. Singing now, with years in reserve.' },
    { id: 'cristal-mag', cellarId: 'main', name: 'Cristal', producer: 'Louis Roederer', vintage: 2014, region: 'Champagne', area: 'Champagne', country: 'France', colour: 'sparkling', status: 'ready', quantity: 1, unit: 290, paid: 191, format: 'magnum', grapes: ['Chardonnay', 'Pinot Noir'], score: 96, rating: 5, drinkFrom: 2024, drinkTo: 2034, note: 'The magnum is the connoisseur’s Champagne format — a slower, finer mousse.' },
    { id: 'brunello', cellarId: 'main', name: 'Brunello di Montalcino', producer: 'Biondi-Santi', vintage: 2016, region: 'Tuscany', area: 'Tuscany', country: 'Italy', colour: 'red', status: 'ready', quantity: 2, unit: 210, paid: 151, format: 'standard', grapes: ['Sangiovese'], score: 97, rating: 5, drinkFrom: 2026, drinkTo: 2046, note: 'Austere and ageless: sour cherry, leather and iron. The benchmark.' },
    { id: 'hermitage', cellarId: 'main', name: 'Hermitage La Chapelle', producer: 'Paul Jaboulet Aîné', vintage: 2010, region: 'Northern Rhône', area: 'Rhône', country: 'France', colour: 'red', status: 'cellaring', quantity: 3, unit: 520, paid: 312, format: 'standard', grapes: ['Syrah'], score: 98, rating: 5, drinkFrom: 2025, drinkTo: 2050, note: 'Smoked meat, black olive and violets. Built for the very long haul.' },
    { id: 'chablis', cellarId: 'main', name: 'Chablis Grand Cru Les Clos', producer: 'Domaine Raveneau', vintage: 2018, region: 'Burgundy', area: 'Burgundy', country: 'France', colour: 'white', status: 'cellaring', quantity: 2, unit: 310, paid: 279, format: 'standard', grapes: ['Chardonnay'], score: 96, rating: 4, drinkFrom: 2026, drinkTo: 2038, note: 'Oyster shell and lemon oil, taut as a wire. Needs a few more years.' },
    { id: 'sassicaia', cellarId: 'main', name: 'Sassicaia', producer: 'Tenuta San Guido', vintage: 2019, region: 'Bolgheri, Tuscany', area: 'Tuscany', country: 'Italy', colour: 'red', status: 'cellaring', quantity: 6, unit: 260, paid: 130, format: 'standard', grapes: ['Cabernet Sauvignon', 'Cabernet Franc'], score: 97, rating: 5, drinkFrom: 2027, drinkTo: 2045, note: 'Cassis and cedar with Mediterranean herbs. Coiled and patient.' },
    { id: 'closstehune', cellarId: 'rack', name: 'Riesling Clos Ste Hune', producer: 'Trimbach', vintage: 2015, region: 'Alsace', area: 'Alsace', country: 'France', colour: 'white', status: 'ready', quantity: 2, unit: 180, paid: 207, format: 'standard', grapes: ['Riesling'], score: 95, rating: 5, drinkFrom: 2024, drinkTo: 2040, note: 'Bone-dry and piercing: lime, white flowers and a flicker of petrol.' },
    { id: 'puligny', cellarId: 'main', name: 'Puligny-Montrachet 1er Cru', producer: 'Domaine Leflaive', vintage: 2011, region: 'Burgundy', area: 'Burgundy', country: 'France', colour: 'white', status: 'past', quantity: 1, unit: 190, paid: 76, format: 'standard', grapes: ['Chardonnay'], score: 90, rating: 4, drinkFrom: 2015, drinkTo: 2021, note: 'Was glorious; now gently fading. Drink the last bottle soon.' },
    { id: 'port', cellarId: 'rack', name: 'Vintage Port', producer: "Taylor's", vintage: 2011, region: 'Douro', area: 'Douro', country: 'Portugal', colour: 'red', status: 'cellaring', quantity: 4, unit: 95, paid: 71, format: 'standard', grapes: ['Touriga Nacional', 'Touriga Franca'], score: 99, rating: 5, drinkFrom: 2030, drinkTo: 2070, note: 'Black fruit, violets and immense structure. Still a baby.' },
    { id: 'sancerre', cellarId: 'rack', name: 'Sancerre Les Romains', producer: 'Domaine Vacheron', vintage: 2022, region: 'Loire', area: 'Loire', country: 'France', colour: 'white', status: 'ready', quantity: 5, unit: 38, paid: 26, format: 'standard', grapes: ['Sauvignon Blanc'], score: 91, rating: 4, drinkFrom: 2024, drinkTo: 2028, note: 'Crisp and flinty: grapefruit, gooseberry, a saline snap. Apéritif joy.' },
    { id: 'coterotie', cellarId: 'rack', name: 'Côte-Rôtie Brune et Blonde', producer: 'E. Guigal', vintage: 2018, region: 'Northern Rhône', area: 'Rhône', country: 'France', colour: 'red', status: 'cellaring', quantity: 3, unit: 110, paid: 68, format: 'standard', grapes: ['Syrah', 'Viognier'], score: 93, rating: 4, drinkFrom: 2025, drinkTo: 2035, note: 'Bacon fat, blackberry and a floral lift. Just coming together.' },
  ]
}

export function seedDrinks(): Drink[] {
  return [
    { id: 'd1', bottleId: 'cristal', cellarId: 'main', name: 'Cristal', producer: 'Louis Roederer', vintage: 2014, region: 'Champagne', area: 'Champagne', colour: 'sparkling', format: 'standard', drinkFrom: 2024, drinkTo: 2034, date: '2026-05-18', occasion: 'celebration', companions: 'Priya & Tom', rating: 5, note: 'Anniversary. Chalky, taut, endless — everything a great Champagne should be.', buyAgain: true },
    { id: 'd2', bottleId: 'sancerre', cellarId: 'rack', name: 'Sancerre Les Romains', producer: 'Domaine Vacheron', vintage: 2022, region: 'Loire', area: 'Loire', colour: 'white', format: 'standard', drinkFrom: 2024, drinkTo: 2028, date: '2026-04-27', occasion: 'everyday', companions: '', rating: 4, note: 'Tuesday apéritif on the terrace. Flinty and bright.', buyAgain: true },
    { id: 'd3', bottleId: 'hermitage', cellarId: 'main', name: 'Hermitage La Chapelle', producer: 'Paul Jaboulet Aîné', vintage: 2010, region: 'Northern Rhône', area: 'Rhône', colour: 'red', format: 'standard', drinkFrom: 2020, drinkTo: 2040, date: '2026-02-14', occasion: 'dinner', companions: 'Just us', rating: 5, note: 'Decanted two hours. Bacon fat and violets — stunning with the lamb.', buyAgain: false },
    { id: 'd4', bottleId: 'brunello', cellarId: 'main', name: 'Brunello di Montalcino', producer: 'Biondi-Santi', vintage: 2016, region: 'Tuscany', area: 'Tuscany', colour: 'red', format: 'standard', drinkFrom: 2026, drinkTo: 2046, date: '2025-12-31', occasion: 'celebration', companions: 'The whole table', rating: 5, note: 'New Year. Opened a touch early but glorious. Sour cherry and leather.', buyAgain: true },
    { id: 'd5', bottleId: 'puligny', cellarId: 'main', name: 'Puligny-Montrachet 1er Cru', producer: 'Domaine Leflaive', vintage: 2011, region: 'Burgundy', area: 'Burgundy', colour: 'white', format: 'standard', drinkFrom: 2015, drinkTo: 2021, date: '2025-11-09', occasion: 'dinner', companions: 'Marcus', rating: 3, note: 'Held it a year too long — still lovely but past its very best. Lesson learned.', buyAgain: false },
    { id: 'd6', bottleId: 'chablis', cellarId: 'main', name: 'Chablis Grand Cru Les Clos', producer: 'Domaine Raveneau', vintage: 2018, region: 'Burgundy', area: 'Burgundy', colour: 'white', format: 'standard', drinkFrom: 2024, drinkTo: 2038, date: '2025-09-22', occasion: 'restaurant', companions: 'Client dinner', rating: 4, note: 'At Le Bernardin. Oyster-shell and tension. Worth every euro.', buyAgain: true },
    { id: 'd7', bottleId: 'coterotie', cellarId: 'rack', name: 'Côte-Rôtie Brune et Blonde', producer: 'E. Guigal', vintage: 2018, region: 'Northern Rhône', area: 'Rhône', colour: 'red', format: 'standard', drinkFrom: 2025, drinkTo: 2035, date: '2025-06-03', occasion: 'everyday', companions: '', rating: 4, note: 'Just coming together. Smoked meat and blackberry.', buyAgain: false },
  ]
}

export function seedWishlist(): Wish[] {
  return [
    { id: 'w1', name: 'Romanée-Conti Grand Cru', producer: 'Domaine de la Romanée-Conti', region: 'Burgundy', vintage: '2018', targetPrice: 21000, priority: 'grail', note: 'The one. Auction only. Set an alert and pray.' },
    { id: 'w2', name: 'Hermitage', producer: 'Jean-Louis Chave', region: 'Northern Rhône', vintage: '2019', targetPrice: 420, priority: 'high', note: 'A back-vintage if I can find one with provenance.' },
    { id: 'w3', name: 'Clos du Mesnil', producer: 'Krug', region: 'Champagne', vintage: '2008', targetPrice: 1500, priority: 'high', note: 'For a milestone worth marking.' },
    { id: 'w4', name: 'Único', producer: 'Vega Sicilia', region: 'Ribera del Duero', vintage: '2012', targetPrice: 480, priority: 'medium', note: 'The Spanish benchmark, conspicuously missing.' },
    { id: 'w5', name: 'Le Bourg', producer: 'Clos Rougeard', region: 'Loire', vintage: '2018', targetPrice: 350, priority: 'medium', note: 'Cabernet Franc at its most serious.' },
  ]
}

export function seedCustomCollections(): CustomCollection[] {
  return [
    { id: 'cc-christmas', title: 'Christmas dinner', desc: 'For the table this December.', ids: ['margaux', 'cristal', 'hermitage'] },
    { id: 'cc-cellar-kids', title: 'For the kids one day', desc: 'Bottles to lay down for a future milestone.', ids: ['port', 'monfortino'] },
  ]
}

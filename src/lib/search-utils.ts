
const stateAbbreviations: Record<string, string[]> = {
    'aguascalientes': ['agu', 'as'],
    'baja california': ['bcn', 'bc'],
    'baja california sur': ['bcs', 'bs'],
    'campeche': ['cam', 'cc'],
    'chiapas': ['chp', 'cs'],
    'chihuahua': ['chh', 'ch'],
    'ciudad de mexico': ['cmx', 'df', 'cdmx'],
    'coahuila': ['coa', 'cl'],
    'colima': ['col', 'cm'],
    'durango': ['dur', 'dg'],
    'guanajuato': ['gua', 'gto', 'gt'],
    'guerrero': ['gro', 'gr'],
    'hidalgo': ['hgo', 'hg'],
    'jalisco': ['jal', 'jc'],
    'mexico': ['mex', 'mc'],
    'michoacan': ['mic', 'mich', 'mn'],
    'morelos': ['mor', 'ms'],
    'nayarit': ['nay', 'nt'],
    'nuevo leon': ['nln', 'n.l.', 'nl'],
    'oaxaca': ['oax', 'oc'],
    'puebla': ['pue', 'pl'],
    'queretaro': ['qro', 'qt'],
    'quintana roo': ['roo', 'q. roo', 'qr'],
    'san luis potosi': ['slp', 's.l.p.', 'sp'],
    'sinaloa': ['sin', 'sl'],
    'sonora': ['son', 'sr'],
    'tabasco': ['tab', 'tc'],
    'tamaulipas': ['tam', 'tamps', 'ts'],
    'tlaxcala': ['tla', 'tlax', 'tl'],
    'veracruz': ['ver', 'vz'],
    'yucatan': ['yuc', 'yn'],
    'zacatecas': ['zac', 'zs']
};

// Create a reverse map from abbreviation to full state name
const abbreviationToState: Record<string, string> = {};
for (const state in stateAbbreviations) {
    for (const abbr of stateAbbreviations[state]) {
        abbreviationToState[abbr] = state;
    }
}

/**
 * Normalizes text for location search.
 * - Converts to lowercase.
 * - Removes accents.
 * - Removes special characters except for spaces and commas.
 * - Replaces state abbreviations with full state names.
 * @param text The text to normalize.
 * @returns The normalized text.
 */
export function normalizeLocationText(text: string): string {
    if (!text) return '';

    let normalized = text
        .toLowerCase()
        .normalize("NFD") // Decompose accents
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[.,-]/g, ' '); // Replace punctuation with spaces

    // Replace abbreviations with full state names
    for (const abbr in abbreviationToState) {
        // Use a regex to match whole words only to avoid partial matches like 'sin' in 'sinaloa'
        const regex = new RegExp(`\\b${abbr}\\b`, 'g');
        normalized = normalized.replace(regex, abbreviationToState[abbr]);
    }
    
    // Clean up extra spaces
    return normalized.replace(/\s+/g, ' ').trim();
}

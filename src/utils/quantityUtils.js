/**
 * Parses a unit string like "1 kg", "12 pcs", "500 ml", "each"
 * Returns { value: number, unit: string, type: 'mass' | 'volume' | 'count' | 'each' }
 */
export const parseUnit = (unitStr) => {
    if (!unitStr) return { value: 1, unit: 'unit', type: 'each' };
    
    const str = unitStr.toLowerCase().trim();
    const match = str.match(/^([\d.]+)\s*(.*)$/);
    
    let value = 1;
    let unit = str;
    
    if (match) {
        value = parseFloat(match[1]);
        unit = match[2].trim();
    }
    
    // Categorize unit
    if (unit.includes('kg') || unit.includes('gm') || unit.includes('gram')) {
        return { value, unit, type: 'mass', baseUnit: 'kg' };
    }
    if (unit.includes('liter') || unit.includes('litre') || unit === 'l' || unit === 'ltr' || unit.includes('ml')) {
        return { value, unit, type: 'volume', baseUnit: 'liter' };
    }
    if (unit.includes('pcs') || unit.includes('pc') || unit.includes('dozen')) {
        return { value, unit, type: 'count', baseUnit: 'pcs' };
    }
    
    return { value, unit, type: 'each', baseUnit: unit || 'each' };
};

/**
 * Converts a value to base unit (kg, liter, pcs)
 */
export const toBaseValue = (value, unit) => {
    const u = unit.toLowerCase();
    if (u === 'gm' || u === 'gram') return value / 1000;
    if (u === 'ml') return value / 1000;
    if (u === 'dozen') return value * 12;
    return value;
};

/**
 * Normalizes price to a target quantity
 * @param {number} price - Original price
 * @param {string} unitStr - Original unit string (e.g. "500 gm")
 * @param {object} targets - Current normalization targets { mass: 1, volume: 1, count: 1 }
 */
export const getNormalizedPrice = (price, unitStr, targets) => {
    if (!targets) return price;
    
    const parsed = parseUnit(unitStr);
    const baseValue = toBaseValue(parsed.value, parsed.unit);
    const target = targets[parsed.type];
    
    if (target === undefined || target === null) return price;
    
    // (price / recordedBaseValue) * targetQuantity
    return (price / baseValue) * target;
};

/**
 * Returns a human readable target unit string
 */
export const getTargetUnitLabel = (type, value, originalUnit) => {
    if (type === 'mass') return `${value} kg`;
    if (type === 'volume') return `${value} L`;
    if (type === 'count') return `${value} pcs`;
    return `${value} ${originalUnit}`;
};

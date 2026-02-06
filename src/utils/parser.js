import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

/**
 * Data Parsing Utilities
 * Handles parsing of XLSX/CSV files using ExcelJS
 */

/**
 * Parse file content into normalized data structure
 * @param {File} file - The file to parse
 * @returns {Promise<Array>} Parsed data array
 */
export async function parseFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const buffer = e.target.result;
                const normalized = await parseBuffer(buffer, file.name);
                resolve(normalized);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Parse ArrayBuffer into normalized data structure
 * @param {ArrayBuffer} buffer - The buffer to parse
 * @param {string} fileName - Filename to determine type
 * @returns {Promise<Array>} Parsed data array
 */
export async function parseBuffer(buffer, fileName = '') {
    try {
        let rows = [];
        const lowerName = fileName.toLowerCase();

        // Strategy: Load data into a standard "Array of Arrays" (rows) structure
        // independent of the source library.

        if (lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
            // Use XLSX for .xls and .csv (more robust in browser)
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        } else {
            // Use ExcelJS for XLSX
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                throw new Error('No worksheets found');
            }

            // Convert ExcelJS worksheet to standard array of arrays
            // ExcelJS row.values is [null, cell1, cell2...] (1-based)
            worksheet.eachRow({ includeEmpty: false }, (row) => {
                rows.push(row.values.slice(1));
            });
        }

        // --- Unified Parsing Logic ---

        // 1. Find Header Row
        let headerIndex = -1;
        let headerRow = null;

        for (let i = 0; i < rows.length; i++) {
            const rowStr = (rows[i] || []).join(' ').toLowerCase();
            // Look for key columns to identify the header
            if (rowStr.includes('date') && rowStr.includes('user')) {
                headerIndex = i;
                headerRow = rows[i];
                break;
            }
        }

        if (headerIndex === -1) {
            // Fallback: assume first row if specific headers not found
            // But if rows is empty, return empty
            if (rows.length === 0) return [];
            headerIndex = 0;
            headerRow = rows[0];
        }

        // 2. Map Data Rows
        const jsonData = [];
        const headers = headerRow.map(h => String(h).trim());

        for (let i = headerIndex + 1; i < rows.length; i++) {
            const rowValues = rows[i];
            const rowObj = {};
            let hasData = false;

            headers.forEach((header, colIdx) => {
                if (header) {
                    const val = rowValues[colIdx];
                    rowObj[header] = val;
                    if (val !== undefined && val !== null && val !== '') hasData = true;
                }
            });

            if (hasData) {
                jsonData.push(rowObj);
            }
        }

        return normalizeData(jsonData);

    } catch (error) {
        console.error("Parser Error", error);
        throw new Error(`Failed to parse data: ${error.message}`);
    }
}

/**
 * Normalize Supabase specific data structure
 */
export function normalizeSupabaseData(data) {
    if (!Array.isArray(data)) return [];

    return data.map((row, index) => {
        const dateVal = row.Date || row.date_spent || row.date || '';
        const user = row.User || row.user || 'Unknown';
        const units = parseFloat(row.Units || row.hours || row.units) || 0;
        const project = row.Project || row.project || 'Unassigned';

        // Extract month from date
        let month = '';
        if (dateVal) {
            if (/^\d{4}-\d{2}$/.test(dateVal)) {
                month = dateVal;
            } else {
                const date = parseDate(dateVal);
                if (date) {
                    month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                }
            }
        }

        return {
            id: index,
            date: month,
            user: String(user).trim(),
            units: units,
            project: String(project).trim(),
            rawDate: dateVal
        };
    }).filter(row => row.user && row.project && row.date && row.units > 0);
}

/**
 * Find column key by pattern matching
 */
function findColumnKey(row, patterns) {
    const keys = Object.keys(row);
    for (const pattern of patterns) {
        const found = keys.find(k => k.trim().toLowerCase().includes(pattern));
        if (found) return found;
    }
    return null;
}

/**
 * Normalize raw data to consistent structure
 */
function normalizeData(data) {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];
    const dateKey = findColumnKey(firstRow, ['date', 'spent']);
    const userKey = findColumnKey(firstRow, ['user']);
    const unitsKey = findColumnKey(firstRow, ['units', 'hours']);
    const projectKey = findColumnKey(firstRow, ['project']);

    if (!dateKey || !userKey || !unitsKey || !projectKey) {
        console.warn('Missing required columns. Found:', { dateKey, userKey, unitsKey, projectKey });
    }

    return data.map((row, index) => {
        const dateVal = dateKey ? row[dateKey] : '';
        const user = userKey ? (row[userKey] || 'Unknown User') : '';
        const units = unitsKey ? parseFloat(row[unitsKey]) || 0 : 0;
        const project = projectKey ? (row[projectKey] || 'Unassigned') : '';

        let month = '';
        if (dateVal) {
            const parsed = parseDate(dateVal);
            if (parsed) {
                month = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
            }
        }

        return {
            id: index,
            date: month,
            user: String(user).trim(),
            units: isNaN(units) ? 0 : units,
            project: String(project).trim(),
            rawDate: dateVal
        };
    }).filter(row => row.user && row.project && row.date && row.units > 0);
}

/**
 * Parse various date formats
 */
function parseDate(dateVal) {
    if (!dateVal) return null;

    // ExcelJS usually returns Date objects for date cells, unlike SheetJS which returns numbers by default
    if (dateVal instanceof Date) {
        return dateVal;
    }

    // Handle Excel serial date number (if ExcelJS returned raw number)
    if (typeof dateVal === 'number') {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        return new Date(excelEpoch.getTime() + dateVal * 86400000);
    }

    const str = String(dateVal).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return new Date(str);
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        const [m, d, y] = str.split('/');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str)) {
        const parts = str.split('/');
        if (parts[0] > 12) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }

    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
}

export function getMonths(data) {
    const months = new Set();
    data.forEach(row => {
        if (row.date) months.add(row.date);
    });
    return Array.from(months).sort();
}

export function getProjects(data) {
    const projects = new Set();
    data.forEach(row => {
        if (row.project) projects.add(row.project);
    });
    return Array.from(projects).sort();
}

export function getDevelopers(data) {
    const developers = new Set();
    data.forEach(row => {
        if (row.user) developers.add(row.user);
    });
    return Array.from(developers).sort();
}

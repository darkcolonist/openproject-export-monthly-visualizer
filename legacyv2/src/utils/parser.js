/**
 * Data Parsing Utilities
 * Handles parsing of XLS/XLSX/CSV files
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
                const normalized = await parseBuffer(e.target.result);
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
 * @returns {Promise<Array>} Parsed data array
 */
export async function parseBuffer(buffer) {
    try {
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        // Find header row by looking for 'date' and 'user' keywords
        const rawRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        let headerIndex = 0;

        for (let i = 0; i < rawRows.length; i++) {
            const rowStr = (rawRows[i] || []).join(' ').toLowerCase();
            if (rowStr.includes('date') && rowStr.includes('user')) {
                headerIndex = i;
                break;
            }
        }

        // Parse with the correct header row
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
            range: headerIndex,
            defval: ''
        });

        return normalizeData(jsonData);
    } catch (error) {
        throw new Error(`Failed to parse data: ${error.message}`);
    }
}

/**
 * Normalize Supabase specific data structure
 */
export function normalizeSupabaseData(data) {
    if (!Array.isArray(data)) return [];

    return data.map((row, index) => {
        // Handle both legacy format (Date, User, Units, Project) and 
        // Supabase format (date_spent, user, hours, project)
        const dateVal = row.Date || row.date_spent || row.date || '';
        const user = row.User || row.user || 'Unknown';
        const units = parseFloat(row.Units || row.hours || row.units) || 0;
        const project = row.Project || row.project || 'Unassigned';

        // Extract month from date
        let month = '';
        if (dateVal) {
            // If already in YYYY-MM format, use as-is
            if (/^\d{4}-\d{2}$/.test(dateVal)) {
                month = dateVal;
            } else {
                // Parse the date
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
 * Dynamically finds columns: Date, User, Units, Project
 */
function normalizeData(data) {
    if (!data || data.length === 0) return [];

    // Determine column keys from first row
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

        // Extract month (YYYY-MM format)
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

    // Handle Excel serial date number
    if (typeof dateVal === 'number') {
        // Use XLSX.SSF if available, otherwise calculate manually
        if (typeof XLSX !== 'undefined' && XLSX.SSF && XLSX.SSF.parse_date_code) {
            const dateObj = XLSX.SSF.parse_date_code(dateVal);
            return new Date(dateObj.y, dateObj.m - 1, dateObj.d);
        }
        // Manual calculation
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        return new Date(excelEpoch.getTime() + dateVal * 86400000);
    }

    // Handle string dates
    const str = String(dateVal).trim();

    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return new Date(str);
    }

    // Try MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        const [m, d, y] = str.split('/');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }

    // Try DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str)) {
        const parts = str.split('/');
        if (parts[0] > 12) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }

    // Fallback to Date.parse
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Get unique months from data sorted chronologically
 */
export function getMonths(data) {
    const months = new Set();
    data.forEach(row => {
        if (row.date) months.add(row.date);
    });
    return Array.from(months).sort();
}

/**
 * Get unique projects from data
 */
export function getProjects(data) {
    const projects = new Set();
    data.forEach(row => {
        if (row.project) projects.add(row.project);
    });
    return Array.from(projects).sort();
}

/**
 * Get unique developers from data
 */
export function getDevelopers(data) {
    const developers = new Set();
    data.forEach(row => {
        if (row.user) developers.add(row.user);
    });
    return Array.from(developers).sort();
}

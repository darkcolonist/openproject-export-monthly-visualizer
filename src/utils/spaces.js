/**
 * DigitalOcean Spaces Integration
 * Handles data upload and configuration persistence
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { setLoading } from '../store/index.js';

/**
 * Upload data to DigitalOcean Spaces
 */
export async function uploadToSpaces(data, filename, config) {
    if (!config || !config.accessKey || !config.secretKey || !config.endpoint || !config.bucket) {
        throw new Error('DigitalOcean Spaces configuration is incomplete');
    }

    setLoading(true, 'Uploading to Spaces...');

    try {
        const regionMatch = config.endpoint.match(/https?:\/\/([^.]+)\./);
        const region = regionMatch ? regionMatch[1] : 'us-east-1';

        const client = new S3Client({
            endpoint: config.endpoint,
            region: region,
            credentials: {
                accessKeyId: config.accessKey || '',
                secretAccessKey: config.secretKey || '',
            },
            // For custom endpoints like DigitalOcean, we often need this
            forcePathStyle: false,
        });

        // Convert data to CSV if it's not already a string
        let content = '';
        if (Array.isArray(data) && data.length > 0) {
            // Map internal keys to standard headers for better compatibility
            // We want to use 'rawDate' as the primary 'Date' column to preserve the full day
            const headerMap = {
                rawDate: 'Date',
                user: 'User',
                units: 'Units',
                project: 'Project'
            };

            const keys = Object.keys(headerMap);
            content = Object.values(headerMap).join(',') + '\n';

            // Rows
            content += data.map(row => {
                return keys.map(key => {
                    const value = row[key] === null || row[key] === undefined ? '' : String(row[key]);
                    // Escape commas and quotes
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',');
            }).join('\n');
        } else {
            content = data;
        }

        const prefix = config.path ? (config.path.endsWith('/') ? config.path : config.path + '/') : '';
        const key = `${prefix}${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}.csv`;

        const command = new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: content,
            ACL: 'public-read',
            ContentType: 'text/csv',
        });

        await client.send(command);

        // Construct public URL
        // DigitalOcean Spaces URL format: https://bucket.endpoint/key
        const url = `${config.endpoint.replace('https://', `https://${config.bucket}.`)}/${key}`;

        setLoading(false);
        return url;
    } catch (error) {
        setLoading(false);
        console.error('Spaces upload error:', error);
        throw new Error(`Failed to upload to Spaces: ${error.message}`);
    }
}

/**
 * Get saved Spaces config from localStorage
 */
export function getSpacesConfig() {
    try {
        const config = localStorage.getItem('spacesConfig');
        if (config) {
            return JSON.parse(config);
        }
    } catch (e) {
        console.error('Error loading Spaces config:', e);
    }
    return null;
}

/**
 * Save Spaces config to localStorage
 */
export function saveSpacesConfig(config) {
    localStorage.setItem('spacesConfig', JSON.stringify(config));
}

/**
 * Clear Spaces config from localStorage
 */
export function clearSpacesConfig() {
    localStorage.removeItem('spacesConfig');
}

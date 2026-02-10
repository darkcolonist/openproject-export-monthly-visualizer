/**
 * DigitalOcean Spaces Integration
 * Handles data upload and configuration persistence
 */
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { setLoading } from '../store/index.js';

/**
 * List files from DigitalOcean Spaces
 */
export async function listSpacesFiles(config, continuationToken = null) {
    if (!config || !config.accessKey || !config.secretKey || !config.endpoint || !config.bucket) {
        throw new Error('DigitalOcean Spaces configuration is incomplete');
    }

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
            forcePathStyle: false,
        });

        const prefix = config.path ? (config.path.endsWith('/') ? config.path : config.path + '/') : '';

        const command = new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: prefix,
            MaxKeys: 5, // Fetch 5 at a time for pagination
            ContinuationToken: continuationToken,
        });

        const response = await client.send(command);

        const files = response.Contents ? response.Contents
            .sort((a, b) => b.LastModified - a.LastModified)
            .map(item => {
                // Construct URLs
                const directUrl = `${config.endpoint.replace('https://', `https://${config.bucket}.`)}/${item.Key}`;
                const baseUrl = window.location.origin + window.location.pathname;
                const hashBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
                const shareUrl = `${hashBase}#/dashboard/spaces/${encodeURIComponent(directUrl)}`;

                // Clean up filename from Key (remove prefix and timestamp)
                const filenameMatch = item.Key.match(/\d+-(.+)\.csv$/);
                const filename = filenameMatch ? filenameMatch[1] : item.Key.replace(prefix, '');

                return {
                    id: item.ETag + item.Key,
                    timestamp: item.LastModified.toISOString(),
                    filename: filename,
                    directUrl: directUrl,
                    shareUrl: shareUrl
                };
            }) : [];

        return {
            files,
            nextContinuationToken: response.NextContinuationToken
        };
    } catch (error) {
        console.error('Spaces list error:', error);
        throw new Error(`Failed to list files from Spaces: ${error.message}`);
    }
}

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
            // Dynamically determine headers from data
            // We want to preserve all original columns, but prioritize our standard headers
            const standardHeaders = {
                rawDate: 'Date',
                user: 'User',
                units: 'Units',
                project: 'Project'
            };

            // Get all unique keys from the data (scan all rows)
            // Using a more robust way to get keys from potential Proxy objects
            const allKeysSet = new Set();
            data.forEach(row => {
                Object.keys(row).forEach(k => allKeysSet.add(k));
            });
            const allKeys = [...allKeysSet];

            // Exclude internal/technical keys that are redundant
            const excludedKeys = ['id', 'date'];

            // Build the header list
            // 1. Start with mapped standard headers
            // 2. Add any other keys that aren't mapped or excluded
            const finalHeaders = [];
            const processedKeys = new Set();

            Object.keys(standardHeaders).forEach(key => {
                finalHeaders.push({ key, label: standardHeaders[key] });
                processedKeys.add(key);
            });

            allKeys.forEach(key => {
                if (!processedKeys.has(key) && !excludedKeys.includes(key)) {
                    finalHeaders.push({ key, label: key });
                    processedKeys.add(key);
                }
            });

            console.log('[Spaces] Final headers for upload:', finalHeaders.map(h => h.label));

            // Construction of CSV content
            content = finalHeaders.map(h => {
                const label = h.label;
                return (label.includes(',') || label.includes('"')) ? `"${label.replace(/"/g, '""')}"` : label;
            }).join(',') + '\n';

            // Rows
            content += data.map(row => {
                return finalHeaders.map(h => {
                    const value = row[h.key] === null || row[h.key] === undefined ? '' : String(row[h.key]);
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
        // Strip existing extensions if present to avoid file.csv.csv
        const cleanFilename = filename.replace(/\.(csv|xls|xlsx)$/i, '').replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `${prefix}${Date.now()}-${cleanFilename}.csv`;

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

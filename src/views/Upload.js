/**
 * Upload View Component
 * Main file upload screen with drag & drop functionality
 */
import { h } from 'preact';
import { useRef, useEffect, useCallback, useState } from 'preact/hooks';
import htm from 'htm';
import { setReportData, setLoading, activeSource, rawData } from 'app/store.js';
import { parseFile, normalizeSupabaseData } from 'app/utils/parser.js';
import { cacheFile, getAllCachedFiles, loadCachedFile, clearCache, getTimeAgo } from 'app/utils/storage.js';
import { goToDashboard } from 'app/router.js';

const html = htm.bind(h);

export function UploadView() {
    const fileInputRef = useRef(null);
    const dropZoneRef = useRef(null);
    const [recentFiles, setRecentFiles] = useState([]);

    // Load recent files on mount
    useEffect(() => {
        loadRecentFiles();
    }, []);

    const loadRecentFiles = async () => {
        const files = await getAllCachedFiles();
        console.log('Loaded cached files:', files.length);
        setRecentFiles(files);
    };

    const handleFile = useCallback(async (file, fileBuffer = null) => {
        if (!file) return;

        console.log('Processing file:', file.name);
        setLoading(true, 'Processing file...');

        try {
            const data = await parseFile(file);
            console.log('Parsed data:', data.length, 'rows');

            if (data.length === 0) {
                alert('No valid data found in the file. Please check the file format.');
                setLoading(false);
                return;
            }

            setReportData(data, file.name);
            activeSource.value = 'file';

            // Cache the file for "Recently Processed"
            if (fileBuffer) {
                await cacheFile(file, fileBuffer, data.length);
            } else {
                // Read file buffer if not provided
                const buffer = await file.arrayBuffer();
                await cacheFile(file, buffer, data.length);
            }

            goToDashboard(file.name);
        } catch (error) {
            console.error('File processing error:', error);
            alert('Failed to process file: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleLoadCached = useCallback(async (filename) => {
        console.log('Loading cached file:', filename);
        setLoading(true, 'Loading cached file...');

        try {
            const cached = await loadCachedFile(filename);
            if (cached && cached.data) {
                // Check if this is Supabase cache (data is JSON array, not ArrayBuffer)
                if (cached.isSupabase || filename === 'SUPABASE_CACHE') {
                    console.log('Loading Supabase cached data');
                    // Supabase data is stored as JSON array directly
                    let data = cached.data;

                    // If it's a string, parse it
                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }

                    // Normalize Supabase data if needed
                    const normalizedData = normalizeSupabaseData(data);

                    if (normalizedData.length > 0) {
                        setReportData(normalizedData, 'Supabase Connection');
                        activeSource.value = 'supabase';
                        // Use special key for Supabase cache to persist in URL
                        goToDashboard('SUPABASE_CACHE');
                    } else {
                        alert('No valid data found in cached Supabase data.');
                        loadRecentFiles();
                    }
                } else {
                    // Regular file cache - parse as file
                    const blob = new Blob([cached.data]);
                    const file = new File([blob], filename);
                    await handleFile(file, cached.data);
                }
            } else {
                alert('Cached file has expired or is no longer available.');
                loadRecentFiles(); // Refresh list
            }
        } catch (error) {
            console.error('Error loading cached file:', error);
            alert('Failed to load cached file: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [handleFile]);



    const handleClearCache = useCallback(async () => {
        if (confirm('Clear all cached files? This cannot be undone.')) {
            await clearCache();
            setRecentFiles([]);
        }
    }, []);

    // Setup event listeners using useEffect for proper binding
    useEffect(() => {
        const dropZone = dropZoneRef.current;
        const fileInput = fileInputRef.current;

        if (!dropZone || !fileInput) {
            return;
        }

        console.log('Setting up upload event listeners');

        const handleClick = (e) => {
            e.stopPropagation();
            fileInput.click();
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('border-blue-500', 'bg-slate-800', 'scale-[1.02]');
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('border-blue-500', 'bg-slate-800', 'scale-[1.02]');
        };

        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('File dropped');
            dropZone.classList.remove('border-blue-500', 'bg-slate-800', 'scale-[1.02]');

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        };

        const handleFileChange = (e) => {
            console.log('File input changed');
            if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        };

        // Add event listeners
        dropZone.addEventListener('click', handleClick);
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileChange);

        // Cleanup
        return () => {
            dropZone.removeEventListener('click', handleClick);
            dropZone.removeEventListener('dragover', handleDragOver);
            dropZone.removeEventListener('dragleave', handleDragLeave);
            dropZone.removeEventListener('drop', handleDrop);
            fileInput.removeEventListener('change', handleFileChange);
        };
    }, [handleFile]);

    return html`
        <div class="w-full h-full overflow-y-auto flex items-start justify-center transition-all duration-500 ease-in-out">
            <div class="w-full max-w-xl mt-20 p-6">
                <!-- Header -->
                <div class="text-center mb-8">
                    <h2 class="text-2xl font-bold text-slate-100 mb-2">Upload Cost Report</h2>
                    <p class="text-slate-400">Drag and drop your .xls or .csv file to see monthly trends.</p>
                </div>

                <!-- Drop Zone -->
                <div 
                    ref=${dropZoneRef}
                    class="bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center transition-all cursor-pointer hover:border-blue-500 hover:bg-slate-800 hover:shadow-xl group"
                >
                    <input 
                        ref=${fileInputRef}
                        type="file"
                        class="hidden"
                        accept=".csv, .xls, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    />
                    <div class="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700">
                        <i class="ph ph-calendar-plus text-4xl text-blue-400"></i>
                    </div>
                    <p class="text-lg font-semibold text-slate-200 mb-1">Click or Drag File</p>
                    <p class="text-sm text-slate-500">Supports Excel (.xls, .xlsx) & CSV</p>
                </div>

                <!-- Template Download Link -->
                <div class="mt-4 text-center">
                    <a href="assets/sample-template.csv" download="openproject-sample-template.csv"
                        class="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        <i class="ph ph-download-simple"></i>
                        <span>Download Sample Template</span>
                    </a>
                    <p class="text-xs text-slate-500 mt-1">Your file must match this format: Date, User, Units, Project</p>
                </div>

                <!-- Recently Processed Section -->
                ${recentFiles.length > 0 && html`
                    <div class="mt-8">
                        <div class="flex items-center justify-center gap-3 mb-3">
                            <h3 class="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <i class="ph ph-clock-counter-clockwise text-blue-400"></i>
                                Recently Processed
                            </h3>
                            <button 
                                onClick=${handleClearCache}
                                class="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                                title="Clear cache"
                            >
                                <i class="ph ph-trash text-sm"></i>
                            </button>
                        </div>
                        <div class="space-y-2">
                            ${recentFiles.map(file => html`
                                <button 
                                    key=${file.name}
                                    onClick=${() => handleLoadCached(file.name)}
                                    class="w-full text-left text-sm text-slate-300 hover:text-blue-400 hover:bg-slate-800 px-4 py-2.5 rounded-lg border border-slate-700 hover:border-blue-500 transition-all flex items-center justify-between group"
                                >
                                    <div class="flex items-center gap-3 flex-1 min-w-0">
                                        <i class="${file.isSupabase ? 'ph ph-database text-blue-400' : 'ph ph-file-xls text-green-400'} text-lg flex-shrink-0"></i>
                                        <div class="flex-1 min-w-0">
                                            <div class="font-medium truncate">
                                                ${file.isSupabase ? 'Supabase Live Connection' : file.name}
                                            </div>
                                            <div class="text-xs text-slate-500 mt-0.5">
                                                ${file.rowCount ? `${file.rowCount} rows` : 'Unknown rows'} • ${getTimeAgo(file.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                    <i class="ph ph-arrow-right text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0"></i>
                                </button>
                            `)}
                        </div>
                    </div>
                `}

                ${recentFiles.length === 0 && html`
                    <div class="mt-8">
                        <h3 class="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2 justify-center">
                            <i class="ph ph-clock-counter-clockwise text-blue-400"></i>
                            Recently Processed
                        </h3>
                        <p class="text-xs text-slate-600 text-center py-4">No recent files</p>
                    </div>
                `}

                <!-- Footer -->
                <div class="mt-12 text-center pb-6">
                    <a href="https://github.com/darkcolonist/openproject-export-monthly-visualizer" target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-blue-400 transition-colors">
                        <i class="ph ph-github-logo text-base"></i>
                        <span>Open Source on GitHub</span>
                    </a>
                </div>
            </div>
        </div>
    `;
}

export default UploadView;

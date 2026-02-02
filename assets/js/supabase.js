window.App = window.App || {};

App.supabase = {
    config: {
        url: null,
        key: null,
        tableName: 'openproject_timeentries',
        startDate: null,
        endDate: null
    },

    async fetchData() {
        const { url, key, tableName, startDate, endDate } = this.config;
        if (!url || !key) return null;

        try {
            // Build URL with filters
            let fetchUrl = `${url}/rest/v1/${tableName}?order=date_spent.desc&limit=1000`;

            if (startDate && endDate) {
                // Filter by selected range
                fetchUrl += `&date_spent=gte.${startDate}-01`;

                const [y, m] = endDate.split('-');
                const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
                fetchUrl += `&date_spent=lte.${y}-${m}-${lastDay}`;
            } else {
                // Default to last 3 months if no range selected
                const today = new Date();
                const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                const isoDate = threeMonthsAgo.toISOString().split('T')[0];
                fetchUrl += `&date_spent=gte.${isoDate}`;
            }

            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch from Supabase');
            }

            return await response.json();
        } catch (err) {
            console.error('Supabase fetch error:', err);
            throw err;
        }
    },

    async fetchDataCount() {
        const { url, key, tableName, startDate, endDate } = this.config;
        if (!url || !key) return 0;

        try {
            // Build URL with filters but limit 0 to just get headers/count
            let fetchUrl = `${url}/rest/v1/${tableName}?limit=0`;

            if (startDate && endDate) {
                fetchUrl += `&date_spent=gte.${startDate}-01`;
                const [y, m] = endDate.split('-');
                const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
                fetchUrl += `&date_spent=lte.${y}-${m}-${lastDay}`;
            } else {
                const today = new Date();
                const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                const isoDate = threeMonthsAgo.toISOString().split('T')[0];
                fetchUrl += `&date_spent=gte.${isoDate}`;
            }

            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`,
                    'Prefer': 'count=exact'
                }
            });

            if (!response.ok) return 0;

            const contentRange = response.headers.get('content-range');
            if (contentRange) {
                // Format: 0-0/1234
                const count = contentRange.split('/')[1];
                return parseInt(count) || 0;
            }
            return 0;
        } catch (err) {
            console.error('Supabase count error:', err);
            return 0;
        }
    },

    async sync() {
        const { url, key } = this.config;
        if (!url || !key) {
            App.showSupabaseModal();
            return;
        }

        try {
            App.showLoading('Syncing with Supabase...');
            const data = await this.fetchData();

            if (data && data.length > 0) {
                // Map Supabase fields to the Expected schema if necessary
                // Supabase schema: id, created_at, timeentry_id, date_spent, user, activity, work_package, comment, project, hours
                // XLS schema: Date, User, Units, Project

                const normalizedData = data.map(row => ({
                    'Date': row.date_spent,
                    'User': row.user,
                    'Units': row.hours,
                    'Project': row.project,
                    '_isSupabase': true // Flag for metadata
                }));

                App.state.rawJsonData = normalizedData;
                App.state.fileName = 'Supabase Connection';
                App.state.activeSource = 'supabase';

                // Row limit warning
                if (data.length >= 1000) {
                    if (App.elements.supabaseWarning) App.elements.supabaseWarning.classList.remove('hidden');
                } else {
                    if (App.elements.supabaseWarning) App.elements.supabaseWarning.classList.add('hidden');
                }

                // Cache Supabase data with 365 days expiry in IndexedDB
                App.cacheSupabaseData(normalizedData);

                App.processAndRender();
                App.hideLoading();

                // Update URL
                const newUrl = `${window.location.pathname}?supabase=connected`;
                window.history.replaceState({ source: 'supabase' }, '', newUrl);

                // Update UI state
                App.updateSupabaseStatus(true);
            } else {
                App.hideLoading();
                alert('No data found in Supabase.');
            }
        } catch (err) {
            App.hideLoading();
            App.showErrorModal('Supabase Sync Failed', err.message);
        }
    },

    disconnect() {
        App.showConfirm('Are you sure you want to disconnect from Supabase? This will clear your credentials and cached data.', () => {
            this.config.url = null;
            this.config.key = null;
            App.state.activeSource = null;
            App.clearSupabaseConfig();
            window.location.href = './';
        });
    }
};

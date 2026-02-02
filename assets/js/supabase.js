window.App = window.App || {};

App.supabase = {
    config: {
        url: null,
        key: null,
        tableName: 'openproject_timeentries'
    },

    async fetchData(filters = {}) {
        const { url, key, tableName } = this.config;
        if (!url || !key) return null;

        try {
            // Build URL with filters
            let fetchUrl = `${url}/rest/v1/${tableName}?order=date_spent.desc`;

            // Add custom filters if provided (e.g., date ranges)
            // For now, mirroring the example provided by the user
            // fetchUrl += '&limit=1000'; 

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

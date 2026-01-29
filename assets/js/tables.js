window.App = window.App || {};

App.renderProjectTable = function renderProjectTable(monthKeys, monthLabels, projectsList, projectMap) {
    const { projectTableHeaderRow, projectTableBody } = App.elements;
    if (!projectTableHeaderRow || !projectTableBody) return;

    let headerHTML = `<th class="sticky-col-header sticky-col-shadow px-6 py-3 font-medium text-slate-400 bg-slate-900 border-b border-slate-700 text-left">Project</th>`;
    monthLabels.forEach(label => {
        headerHTML += `<th class="px-6 py-3 font-medium text-slate-400 bg-slate-900 border-b border-slate-700 text-right whitespace-nowrap">${label}</th>`;
    });
    headerHTML += `<th class="px-6 py-3 font-bold text-slate-200 bg-slate-900 border-b border-slate-700 text-right whitespace-nowrap">Grand Total</th>`;
    projectTableHeaderRow.innerHTML = headerHTML;

    let bodyHTML = '';

    projectsList.forEach((project, index) => {
        let rowTotal = 0;
        let rowCells = '';
        const color = App.utils.getColor(index);

        monthKeys.forEach(mKey => {
            const val = projectMap[project][mKey] || 0;
            rowTotal += val;
            const displayVal = val > 0 ? val.toFixed(2) : '<span class="text-slate-700">-</span>';
            rowCells += `<td class="px-6 py-3 text-right text-slate-400 border-b border-slate-800">${displayVal}</td>`;
        });

        bodyHTML += `
            <tr class="hover:bg-slate-800 transition-colors">
                <td class="sticky-col sticky-col-shadow px-6 py-3 font-medium text-slate-300 border-b border-slate-800 bg-slate-900">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${color};"></span>
                        <span>${App.utils.escapeHtml(project)}</span>
                    </div>
                </td>
                ${rowCells}
                <td class="px-6 py-3 font-bold text-blue-400 text-right border-b border-slate-800 bg-slate-800/50">${rowTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    projectTableBody.innerHTML = bodyHTML;
};

App.renderTable = function renderTable(monthKeys, monthLabels, usersList, userMap) {
    const { tableHeaderRow, tableBody } = App.elements;
    if (!tableHeaderRow || !tableBody) return;

    let headerHTML = `<th class="sticky-col-header sticky-col-shadow px-6 py-3 font-medium text-slate-400 bg-slate-900 border-b border-slate-700 text-left">Developer</th>`;
    monthLabels.forEach(label => {
        headerHTML += `<th class="px-6 py-3 font-medium text-slate-400 bg-slate-900 border-b border-slate-700 text-right whitespace-nowrap">${label}</th>`;
    });
    headerHTML += `<th class="px-6 py-3 font-bold text-slate-200 bg-slate-900 border-b border-slate-700 text-right whitespace-nowrap">Grand Total</th>`;
    tableHeaderRow.innerHTML = headerHTML;

    let bodyHTML = '';

    usersList.forEach((user) => {
        let rowTotal = 0;
        let rowCells = '';

        monthKeys.forEach(mKey => {
            const val = userMap[user][mKey] || 0;
            rowTotal += val;
            const displayVal = val > 0 ? val.toFixed(2) : '<span class="text-slate-700">-</span>';
            rowCells += `<td class="px-6 py-3 text-right text-slate-400 border-b border-slate-800">${displayVal}</td>`;
        });

        bodyHTML += `
            <tr class="hover:bg-slate-800 transition-colors">
                <td class="sticky-col sticky-col-shadow px-6 py-3 font-medium text-slate-300 border-b border-slate-800 bg-slate-900">
                    ${App.utils.escapeHtml(user)}
                </td>
                ${rowCells}
                <td class="px-6 py-3 font-bold text-blue-400 text-right border-b border-slate-800 bg-slate-800/50">${rowTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = bodyHTML;
};

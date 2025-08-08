const API_BASE_URL = window.location.origin; // Dynamically set API base URL

// --- Utility Functions ---
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching data from ${endpoint}:`, error);
        return null;
    }
}

async function postData(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error || response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error posting data to ${endpoint}:`, error);
        alert(`Failed to save: ${error.message}`);
        return null;
    }
}

// --- Global UI Update Functions ---
function updateSystemStatus(statusData) {
    const statusElem = document.getElementById('systemStatus');
    const messageElem = document.getElementById('systemStatusMessage');

    if (statusElem && messageElem) {
        statusElem.textContent = statusData.status;
        statusElem.className = ''; // Clear previous classes
        if (statusData.status === 'Safe') {
            statusElem.classList.add('status-safe');
        } else if (statusData.status === 'Under Attack') {
            statusElem.classList.add('status-under-attack');
        } else if (statusData.status === 'Suspicious') {
            statusElem.classList.add('status-suspicious');
        }
        messageElem.textContent = statusData.message;
    }
}

let threatsDetectedChartInstance = null; // To manage Chart.js instance

function updateThreatsDetectedChart(chartData) {
    const ctx = document.getElementById('threatsDetectedChart');
    if (!ctx) return;

    if (threatsDetectedChartInstance) {
        threatsDetectedChartInstance.destroy(); // Destroy existing chart before creating a new one
    }

    threatsDetectedChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Threats Detected',
                data: chartData.data,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Threats',
                        color: '#e0e0e0'
                    },
                    ticks: { color: '#a0a0c0' },
                    grid: { color: '#333' }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#e0e0e0'
                    },
                    ticks: { color: '#a0a0c0' },
                    grid: { color: '#333' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e0e0e0' } },
                tooltip: { titleColor: '#e0e0e0', bodyColor: '#e0e0e0', backgroundColor: 'rgba(0,0,0,0.8)' }
            }
        }
    });
}

function updateRecentAlerts(alertsList) {
    const recentAlertsListElem = document.getElementById('recentAlertsList');
    if (!recentAlertsListElem) return;

    recentAlertsListElem.innerHTML = '';
    if (alertsList.length === 0) {
        recentAlertsListElem.innerHTML = '<p>No recent alerts.</p>';
        return;
    }

    alertsList.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.classList.add('alert-item');
        alertItem.innerHTML = `
            <p><strong>${alert.alert_type}</strong> from ${alert.source_ip}</p>
            <p>${new Date(alert.timestamp).toLocaleString()}</p>
        `;
        recentAlertsListElem.appendChild(alertItem);
    });
}


// --- Page-Specific Load Functions ---

async function loadDashboardPage() {
    const data = await fetchData('dashboard_summary');
    if (data) {
        updateSystemStatus(data.system_status);
        updateThreatsDetectedChart(data.threats_detected_chart);
        // Active devices list (currently static in HTML, but could be dynamic)
        updateRecentAlerts(data.recent_alerts);
    }
}

let alertsRefreshInterval = null; // For auto-refresh

async function loadAlertsPage() {
    const newAlertsCountElem = document.getElementById('newAlertsCount');
    const highSeverityCountElem = document.getElementById('highSeverityCount');
    const blockThreatsCountElem = document.getElementById('blockThreatsCount');
    const alertsTableBody = document.getElementById('alertsTableBody');
    const searchAlertsInput = document.getElementById('searchAlerts');
    const dataFilterSelect = document.getElementById('dataFilter');
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    const severityButtons = document.querySelectorAll('.severity-btn');

    let currentSeverityFilters = ['All']; // Track active filters

    // Function to fetch and render alerts
    const fetchAndRenderAlerts = async () => {
        const search = searchAlertsInput.value;
        const dataFilter = dataFilterSelect.value;
        const severity = currentSeverityFilters.includes('All') ? [] : currentSeverityFilters;
        const status = 'Active'; // For this page, we show active alerts primarily

        const queryParams = new URLSearchParams({
            search,
            dataFilter,
            status,
        });
        severity.forEach(s => queryParams.append('severity[]', s));

        const data = await fetchData(`alerts?${queryParams.toString()}`);
        if (data) {
            if (newAlertsCountElem) newAlertsCountElem.textContent = data.new_alerts_count;
            if (highSeverityCountElem) highSeverityCountElem.textContent = data.high_severity_count;
            if (blockThreatsCountElem) blockThreatsCountElem.textContent = data.block_threats_count;

            if (alertsTableBody) {
                alertsTableBody.innerHTML = ''; // Clear existing rows
                if (data.active_alerts.length === 0) {
                    alertsTableBody.innerHTML = '<tr><td colspan="7" class="no-data-row">No active alerts found.</td></tr>';
                } else {
                    data.active_alerts.forEach(alert => {
                        const row = alertsTableBody.insertRow();
                        row.innerHTML = `
                            <td>${new Date(alert.timestamp).toLocaleTimeString()}</td>
                            <td><a href="/alert_details/${alert.id}">${alert.alert_type}</a></td>
                            <td><span class="badge ${alert.severity.toLowerCase()}">${alert.severity}</span></td>
                            <td>${alert.source_ip}</td>
                            <td>${alert.action_taken}</td>
                            <td><span class="badge ${alert.status.toLowerCase()}">${alert.status}</span></td>
                            <td>
                                <button class="btn btn-secondary btn-sm" onclick="updateAlertStatus('${alert.id}', 'Resolved')">Resolve</button>
                            </td>
                        `;
                    });
                }
            }
        }
    };

    // Initial load
    if (document.getElementById('alertsTableBody')) { // Check if on alerts page
        fetchAndRenderAlerts();

        // Event listeners for filters
        searchAlertsInput.addEventListener('input', fetchAndRenderAlerts);
        dataFilterSelect.addEventListener('change', fetchAndRenderAlerts);
        
        severityButtons.forEach(button => {
            button.addEventListener('click', () => {
                const severity = button.dataset.severity;
                severityButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentSeverityFilters = [severity]; // Simple single select
                fetchAndRenderAlerts();
            });
        });

        // Auto Refresh Toggle
        autoRefreshToggle.addEventListener('change', () => {
            if (autoRefreshToggle.checked) {
                alertsRefreshInterval = setInterval(fetchAndRenderAlerts, 10000); // Refresh every 10 seconds
            } else {
                clearInterval(alertsRefreshInterval);
            }
        });
        // Start auto refresh if checked on load
        if (autoRefreshToggle.checked) {
            alertsRefreshInterval = setInterval(fetchAndRenderAlerts, 10000);
        }
    }
}

async function updateAlertStatus(alertId, newStatus) {
    const response = await postData(`alert/${alertId}/update_status`, { status: newStatus });
    if (response) {
        alert(`Alert ${alertId} status updated to ${newStatus}`);
        loadAlertsPage(); // Re-fetch alerts to update the table
    }
}

let detectionTrendChartInstance = null;
let topThreatTypesChartInstance = null;
let avgResponseSpeedChartInstance = null;

async function loadThreatAnalyticsPage() {
    const data = await fetchData('threat_analytics_summary');
    if (data) {
        document.getElementById('aiThreatsToday').textContent = data.ai_predicted_threats_today;
        document.getElementById('criticalThreats').textContent = data.critical_severity_threats;
        document.getElementById('totalThreatsWeek').textContent = data.total_threats_this_week;
        document.getElementById('suddenRise').textContent = data.sudden_rise_in_suspicious_behavior;

        // Detection Trend Chart
        const trendCtx = document.getElementById('detectionTrendChart');
        if (trendCtx) {
            if (detectionTrendChartInstance) detectionTrendChartInstance.destroy();
            detectionTrendChartInstance = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: data.detection_trend.labels,
                    datasets: [
                        { label: 'SQL Injection', data: data.detection_trend.sql_injection, borderColor: '#dc3545', tension: 0.1, fill: false },
                        { label: 'DDoS Attack', data: data.detection_trend.ddos_attack, borderColor: '#ffc107', tension: 0.1, fill: false },
                        { label: 'Brute Force', data: data.detection_trend.brute_force, borderColor: '#17a2b8', tension: 0.1, fill: false },
                        { label: 'Other', data: data.detection_trend.other, borderColor: '#6c757d', tension: 0.1, fill: false }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { color: '#a0a0c0' }, grid: { color: '#333' } }, x: { ticks: { color: '#a0a0c0' }, grid: { color: '#333' } } },
                    plugins: { legend: { labels: { color: '#e0e0e0' } }, tooltip: { titleColor: '#e0e0e0', bodyColor: '#e0e0e0', backgroundColor: 'rgba(0,0,0,0.8)' } }
                }
            });
        }

        // Top Threat Types Chart
        const pieCtx = document.getElementById('topThreatTypesChart');
        if (pieCtx) {
            if (topThreatTypesChartInstance) topThreatTypesChartInstance.destroy();
            topThreatTypesChartInstance = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: data.top_threat_types.map(t => t.name),
                    datasets: [{
                        data: data.top_threat_types.map(t => t.value),
                        backgroundColor: ['#dc3545', '#ffc107', '#17a2b8', '#6c757d'] // Example colors
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#e0e0e0' } },
                        tooltip: { titleColor: '#e0e0e0', bodyColor: '#e0e0e0', backgroundColor: 'rgba(0,0,0,0.8)' }
                    }
                }
            });
        }

        // Recent Threats Table
        const recentThreatsTableBody = document.getElementById('recentThreatsTableBody');
        if (recentThreatsTableBody) {
            recentThreatsTableBody.innerHTML = '';
            if (data.recent_threats.length === 0) {
                recentThreatsTableBody.innerHTML = '<tr><td colspan="4" class="no-data-row">No recent threats.</td></tr>';
            } else {
                data.recent_threats.forEach(threat => {
                    const row = recentThreatsTableBody.insertRow();
                    row.innerHTML = `
                        <td>${new Date(threat.timestamp).toLocaleString()}</td>
                        <td><span class="badge ${threat.severity.toLowerCase()}">${threat.severity}</span></td>
                        <td>${threat.alert_type}</td>
                        <td>${threat.source_ip}</td>
                    `;
                });
            }
        }

        // Avg Response Speed Chart
        const barCtx = document.getElementById('avgResponseSpeedChart');
        if (barCtx) {
            if (avgResponseSpeedChartInstance) avgResponseSpeedChartInstance.destroy();
            avgResponseSpeedChartInstance = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(data.avg_response_speed),
                    datasets: [{
                        label: 'Avg Response Time (sec)',
                        data: Object.values(data.avg_response_speed),
                        backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545'] // Example colors
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { color: '#a0a0c0' }, grid: { color: '#333' } }, x: { ticks: { color: '#a0a0c0' }, grid: { color: '#333' } } },
                    plugins: { legend: { display: false }, tooltip: { titleColor: '#e0e0e0', bodyColor: '#e0e0e0', backgroundColor: 'rgba(0,0,0,0.8)' } }
                }
            });
        }
    }
}

async function loadActivityLogsPage() {
    const totalLogEntriesElem = document.getElementById('totalLogEntries');
    const successfulActionsElem = document.getElementById('successfulActions');
    const failedActionsElem = document.getElementById('failedActions');
    const activityLogsTableBody = document.getElementById('activityLogsTableBody');

    const searchLogsInput = document.getElementById('searchLogs');
    const logDataFilterSelect = document.getElementById('logDataFilter');
    const activityTypeFilterSelect = document.getElementById('activityTypeFilter');
    const userActorFilterSelect = document.getElementById('userActorFilter');

    const fetchAndRenderLogs = async () => {
        const search = searchLogsInput.value;
        const dataFilter = logDataFilterSelect.value;
        const activityType = activityTypeFilterSelect.value;
        const userActor = userActorFilterSelect.value;

        const queryParams = new URLSearchParams({
            search, dataFilter, activityType, userActor
        });

        const data = await fetchData(`activity_logs?${queryParams.toString()}`);
        if (data) {
            if (totalLogEntriesElem) totalLogEntriesElem.textContent = data.total_log_entries;
            if (successfulActionsElem) successfulActionsElem.textContent = `${data.successful_actions_percentage}%`;
            if (failedActionsElem) failedActionsElem.textContent = `${data.failed_actions_percentage}%`;

            if (activityLogsTableBody) {
                activityLogsTableBody.innerHTML = '';
                if (data.recent_activity.length === 0) {
                    activityLogsTableBody.innerHTML = '<tr><td colspan="6" class="no-data-row">No activity logs found.</td></tr>';
                } else {
                    data.recent_activity.forEach(log => {
                        const row = activityLogsTableBody.insertRow();
                        const statusClass = log.status === 'Success' ? 'badge success' : 'badge failed';
                        row.innerHTML = `
                            <td>${new Date(log.timestamp).toLocaleString()}</td>
                            <td>${log.user_actor}</td>
                            <td>${log.activity_type}</td>
                            <td>${log.description}</td>
                            <td><span class="${statusClass}">${log.status}</span></td>
                            <td>${log.source_ip}</td>
                        `;
                    });
                }
            }
        }
    };

    if (document.getElementById('activityLogsTableBody')) {
        fetchAndRenderLogs();
        searchLogsInput.addEventListener('input', fetchAndRenderLogs);
        logDataFilterSelect.addEventListener('change', fetchAndRenderLogs);
        activityTypeFilterSelect.addEventListener('change', fetchAndRenderLogs);
        userActorFilterSelect.addEventListener('change', fetchAndRenderLogs);
    }
}

async function loadAlertDetailsPage() {
    const pathParts = window.location.pathname.split('/');
    const alertId = pathParts[pathParts.length - 1]; // Get ID from URL

    if (!alertId) {
        document.querySelector('.alert-header').innerHTML = '<h2 style="color:red;">Alert ID missing from URL.</h2>';
        return;
    }

    const data = await fetchData(`alert/${alertId}`);
    if (data) {
        document.getElementById('alertType').textContent = data.alert_type;
        document.getElementById('alertId').textContent = `#${data.id.substring(0,8)}`; // Shorten ID for display
        document.getElementById('alertDetectionTime').textContent = new Date(data.timestamp).toLocaleString();

        const statusBadge = document.getElementById('alertStatusBadge');
        statusBadge.textContent = data.status;
        statusBadge.className = `badge ${data.status.toLowerCase()}`;

        const severityBadge = document.getElementById('alertSeverityBadge');
        severityBadge.textContent = `${data.severity} Severity`;
        severityBadge.className = `badge ${data.severity.toLowerCase()}`;
        
        // Populate "What Shield AI Did" and raw log content
        document.getElementById('aiActionDescription').textContent = `PreBreach Shield AI detected a ${data.alert_type.toLowerCase()} from ${data.source_ip} on ${new Date(data.timestamp).toLocaleString()}. Status: ${data.status}. Action: ${data.action_taken}.`;
        
        let rawLogContent = `Flow ID: ${data.raw_flow_summary.Flow_ID}\n`;
        rawLogContent += `Original Label: ${data.raw_flow_summary.Label_Original}\n`;
        rawLogContent += `Source IP: ${data.source_ip}, Dest IP: ${data.destination_ip}\n`;
        rawLogContent += `Protocol: ${data.protocol}, Flow Duration: ${data.raw_flow_summary.Flow_Duration}\n`;
        rawLogContent += `Packet Rate: ${data.raw_flow_summary.Packet_Rate}\n\n`;
        rawLogContent += `Model Outputs:\n`;
        rawLogContent += `  XGBoost Prob: ${data.model_outputs.xgboost_pred_prob.toFixed(4)}\n`;
        rawLogContent += `  Isolation Forest Score: ${data.model_outputs.iso_anomaly_score.toFixed(4)}\n`;
        rawLogContent += `  LSTM Error: ${data.model_outputs.lstm_reconstruction_error.toFixed(6)}\n`;
        rawLogContent += `  Autoencoder Error: ${data.model_outputs.ae_reconstruction_error.toFixed(6)}\n`;

        document.getElementById('activityLogContent').textContent = rawLogContent;

        // Example: Add logic for 'My Notes' and 'Stay Safe Tips' (from DB or static)
        // For 'My Notes', you'd fetch/save from DB
        // For 'Stay Safe Tips', you might have a static list per alert type or severity

        // Event listener for Resolve button on this page
        const gotItBtn = document.getElementById('gotItBtn');
        if (gotItBtn) {
            gotItBtn.addEventListener('click', async () => {
                const response = await postData(`alert/${alertId}/update_status`, { status: 'Resolved' });
                if (response) {
                    alert('Alert marked as resolved!');
                    // Optionally redirect or update UI
                    window.location.reload(); // Simple reload to reflect changes
                }
            });
        }

    } else {
        document.querySelector('.alert-header').innerHTML = '<h2 style="color:red;">Alert not found.</h2>';
    }
}


async function loadSettingsPage() {
    const data = await fetchData('settings');
    if (data) {
        // Account Settings (read-only for this demo)
        document.getElementById('fullName').value = data.account_settings.full_name;
        document.getElementById('emailAddress').value = data.account_settings.email_address;
        document.getElementById('role').value = data.account_settings.role;

        // Notification Preferences
        document.getElementById('emailAlerts').checked = data.notification_preferences.email_alerts;
        document.getElementById('pushNotifications').checked = data.notification_preferences.push_notifications;
        document.getElementById('weeklySecuritySummary').checked = data.notification_preferences.weekly_security_summary;

        // Shield AI Settings
        document.getElementById('detectionSensitivity').value = data.shield_ai_settings.detection_sensitivity;
        document.getElementById('aiAutoResponseLevel').value = data.shield_ai_settings.ai_auto_response_level;
        document.getElementById('allowAutoBlocking').checked = data.shield_ai_settings.allow_auto_blocking;
        document.getElementById('showRealTimeThreatTips').checked = data.shield_ai_settings.show_real_time_threat_tips;
        document.getElementById('improveAiFeedback').checked = data.shield_ai_settings.improve_ai_with_feedback;

        // Security Controls
        document.getElementById('autoBlockLevel').value = data.security_controls.auto_block_level;
        document.getElementById('enableGeofFiltering').checked = data.security_controls.enable_geof_filtering;
        document.getElementById('requireMfaAdminLogin').checked = data.security_controls.require_mfa_admin_login;

        // System Preferences
        document.getElementById('themeSelect').value = data.system_preferences.theme;
        document.getElementById('languageSelect').value = data.system_preferences.language;
        document.getElementById('timezoneSelect').value = data.system_preferences.timezone;

        // Save Settings Button Listener
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', async () => {
                const updatedSettings = {
                    "shield_ai_settings": {
                        "detection_sensitivity": document.getElementById('detectionSensitivity').value,
                        "ai_auto_response_level": document.getElementById('aiAutoResponseLevel').value,
                        "allow_auto_blocking": document.getElementById('allowAutoBlocking').checked,
                        "show_real_time_threat_tips": document.getElementById('showRealTimeThreatTips').checked,
                        "improve_ai_with_feedback": document.getElementById('improveAiFeedback').checked
                    },
                    "security_controls": {
                        "auto_block_level": document.getElementById('autoBlockLevel').value,
                        "enable_geof_filtering": document.getElementById('enableGeofFiltering').checked,
                        "require_mfa_admin_login": document.getElementById('requireMfaAdminLogin').checked
                    },
                    "notification_preferences": {
                        "email_alerts": document.getElementById('emailAlerts').checked,
                        "push_notifications": document.getElementById('pushNotifications').checked,
                        "weekly_security_summary": document.getElementById('weeklySecuritySummary').checked
                    },
                    "system_preferences": {
                        "theme": document.getElementById('themeSelect').value,
                        "language": document.getElementById('languageSelect').value,
                        "timezone": document.getElementById('timezoneSelect').value
                    }
                };
                const response = await postData('settings/update', updatedSettings);
                if (response) {
                    alert('Settings saved successfully!');
                    // Optionally update UI or provide visual feedback
                }
            });
        }
    }
}


// --- Router for single-page application feel ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path === '/' || path === '/dashboard') {
        loadDashboardPage();
        // Optional: Implement a real-time flow input if you want to test from dashboard
        // For now, the separate simulate_traffic.py script sends data.
    } else if (path === '/alerts') {
        loadAlertsPage();
    } else if (path.startsWith('/alert_details/')) {
        loadAlertDetailsPage();
    }
    else if (path === '/threat_analytics') {
        loadThreatAnalyticsPage();
    }
    else if (path === '/activity_logs') {
        loadActivityLogsPage();
    }
    else if (path === '/settings') {
        loadSettingsPage();
    }
    // No specific load for login.html as it's a separate form submission
});
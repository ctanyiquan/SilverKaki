/**
 * Health Kampung App - JavaScript Logic
 * Multi-user, forum, health stats input, attendance-based points
 */

// ============================================
// APP STATE
// ============================================
const AppState = {
    currentScreen: 'loginScreen',
    fetchStatus: 'idle',
    selectedDate: new Date().toISOString().split('T')[0],
    selectedLocation: 'all',
    selectedType: 'all',
    dateOffset: 0,
    currentFeedbackActivity: null,
    currentAttendanceActivity: null,
    currentForumCategory: 'all',
    currentPost: null,
    sugarReadingType: 'fasting',
    onboardingStep: 0,
    onboardingActive: false
};

// Onboarding Steps Configuration
const ONBOARDING_STEPS = [
    {
        icon: '👋',
        titleKey: 'onboardingWelcome',
        descKey: 'onboardingWelcomeDesc',
        target: null // No spotlight, full screen welcome
    },
    {
        icon: '💓',
        titleKey: 'onboardingHealth',
        descKey: 'onboardingHealthDesc',
        target: '.health-card'
    },
    {
        icon: '📅',
        titleKey: 'onboardingActivities',
        descKey: 'onboardingActivitiesDesc',
        target: '[data-screen="activitiesScreen"]'
    },
    {
        icon: '🚗',
        titleKey: 'onboardingTransport',
        descKey: 'onboardingTransportDesc',
        target: '.action-btn.fetch'
    },
    {
        icon: '🎉',
        titleKey: 'onboardingComplete',
        descKey: 'onboardingCompleteDesc',
        target: null // No spotlight, completion message
    }
];

// ============================================
// INITIALIZATION
// ============================================
function initApp() {
    console.log('🏡 SilverKaki App initializing...');

    // Initialize language
    updateLanguageButtons();

    if (Database.isLoggedIn()) {
        navigateTo('homeScreen');
        initLoggedInUser();

        // Check if onboarding should be shown
        checkAndStartOnboarding();
    } else {
        navigateTo('loginScreen');
        loadUserList();
    }

    setupEventListeners();
    setupLanguageListeners();
    setupOnboardingListeners();
    console.log('✅ SilverKaki App ready!');
}

function initLoggedInUser() {
    updateUserUI();
    generateDateButtons();
    loadActivities();
    loadUpcomingActivities();
    updateHealthScreen();
    updateProfileScreen();
    // Ensure demo user has something to rate
    const user = Database.getCurrentUser();
    if (user) Database.ensureDemoFeedback(user.id);

    checkPendingFeedback();
    checkTransportEligibility();
    updateNotificationBadge();
    updateGreeting();
    loadForumPosts();
    loadHealthHistory();
}

// ============================================
// USER LIST & LOGIN
// ============================================
function loadUserList() {
    const users = Database.getAllUsers();
    const container = document.getElementById('userList');
    const modalContainer = document.getElementById('userListModal');

    const html = users.map(user => {
        const avatar = user.gender === 'female' ? '👵' : '👴';
        return `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-card-avatar">${avatar}</div>
                <div class="user-card-info">
                    <div class="user-card-name">${user.name}</div>
                    <div class="user-card-points">⭐ ${user.points} points</div>
                </div>
                <span class="user-card-arrow">→</span>
            </div>
        `;
    }).join('');

    if (container) container.innerHTML = html;
    if (modalContainer) modalContainer.innerHTML = html;

    document.querySelectorAll('.user-card').forEach(card => {
        card.addEventListener('click', () => loginAsUser(card.dataset.userId));
    });
}

function loginAsUser(userId) {
    Database.switchUser(userId);
    document.getElementById('userSwitcherModal')?.classList.add('hidden');
    navigateTo('homeScreen');
    initLoggedInUser();
    showToast(Translation.get('welcomeBack'), '✅');

    // Check if onboarding should be shown for this user
    checkAndStartOnboarding();
}

function showCreateUserScreen() {
    document.getElementById('setupName').value = '';
    document.getElementById('setupAddress').value = '';
    document.querySelectorAll('#profileSetupScreen .level-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.level === 'moderate'));
    document.querySelectorAll('#profileSetupScreen .mobility-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.mobility === 'false'));
    document.querySelectorAll('#profileSetupScreen .interest-btn').forEach(b =>
        b.classList.remove('active'));

    document.getElementById('userSwitcherModal')?.classList.add('hidden');
    navigateTo('profileSetupScreen');
}

function createNewUser() {
    const name = document.getElementById('setupName').value.trim() || 'New User';
    const address = document.getElementById('setupAddress').value.trim();
    const level = document.querySelector('#profileSetupScreen .level-btn.active')?.dataset.level || 'moderate';
    const mobility = document.querySelector('#profileSetupScreen .mobility-btn.active')?.dataset.mobility === 'true';
    const gender = document.querySelector('#profileSetupScreen .gender-btn.active')?.dataset.gender || 'male';
    const interests = Array.from(document.querySelectorAll('#profileSetupScreen .interest-btn.active'))
        .map(b => b.dataset.interest);

    Database.createNewUser({ name, homeAddress: address, activityLevel: level, hasMobilityIssue: mobility, interests, gender });
    navigateTo('homeScreen');
    initLoggedInUser();
    showToast('Account created! 🎉', '✅');
}

function logout() {
    Database.logout();
    loadUserList();
    navigateTo('loginScreen');
}

// ============================================
// USER UI UPDATE
// ============================================
function updateUserUI() {
    const user = Database.getCurrentUser();
    if (!user) return;

    document.getElementById('userName').textContent = `${user.name}! 🌟`;
    document.getElementById('profileName').textContent = user.name;

    // Avatar based on gender
    const avatar = user.gender === 'female' ? '👵' : '👴';
    document.getElementById('userAvatar').textContent = avatar;
    document.getElementById('profileAvatar').textContent = avatar;

    const points = user.points || 0;
    document.getElementById('userPoints').textContent = points;
    document.getElementById('profilePoints').textContent = points;
    document.getElementById('rewardsPoints').textContent = points;

    const voucherTarget = 200;
    const progress = Math.min(100, (points / voucherTarget) * 100);
    document.getElementById('voucherProgress').style.width = `${progress}%`;
    document.getElementById('voucherText').textContent = `${points} / ${voucherTarget} ${Translation.get('points')}`;

    // Voucher redemption logic
    const voucherNote = document.getElementById('voucherNote');
    const redeemBtn = document.getElementById('redeemVoucherBtn');
    const viewBtn = document.getElementById('viewVoucherBtn');

    // Check if user already redeemed a voucher
    if (user.lastVoucherRef) {
        voucherNote.textContent = Translation.get('voucherRedeemed');
        redeemBtn?.classList.add('hidden');
        viewBtn?.classList.remove('hidden');
    } else if (points >= voucherTarget) {
        voucherNote.textContent = Translation.get('voucherReady');
        redeemBtn?.classList.remove('hidden');
        viewBtn?.classList.add('hidden');
    } else {
        const remaining = voucherTarget - points;
        voucherNote.textContent = Translation.get('earnMoreFor').replace('50', remaining);
        redeemBtn?.classList.add('hidden');
        viewBtn?.classList.add('hidden');
    }

    if (user.bloodPressure && user.bloodPressure.length > 0) {
        const latestBP = user.bloodPressure[0];
        document.getElementById('bpReading').textContent = `${latestBP.systolic}/${latestBP.diastolic}`;
        let status = 'Normal', statusClass = 'good';
        if (latestBP.systolic >= 140) { status = 'High'; statusClass = 'warning'; }
        else if (latestBP.systolic >= 130) { status = 'Elevated'; statusClass = 'okay'; }
        const bpBadge = document.getElementById('bpStatus');
        bpBadge.textContent = status;
        bpBadge.className = `bp-badge ${statusClass}`;
    }

    // Populate Recently Earned section
    const rewardsList = document.getElementById('recentRewardsList');
    if (rewardsList) {
        let rewardsHTML = '';

        // Add redeemed voucher if exists
        if (user.lastVoucherRef && user.lastVoucherDate) {
            const voucherDate = new Date(user.lastVoucherDate);
            const dateStr = voucherDate.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
            rewardsHTML += `
                <div class="reward-item">
                    <span class="reward-icon">🎫</span>
                    <div class="reward-info">
                        <span class="reward-name">$5 NTUC Voucher</span>
                        <span class="reward-date">Redeemed ${dateStr}</span>
                    </div>
                </div>
            `;
        }

        // Add recent badges
        if (user.badges && user.badges.length > 0) {
            const badgeNames = {
                'first_timer': '🌟 First Timer',
                'active_star': '🏆 Active Star',
                'social_bee': '🐝 Social Bee',
                'super_active': '💪 Super Active'
            };
            user.badges.slice(0, 2).forEach(badge => {
                rewardsHTML += `
                    <div class="reward-item">
                        <span class="reward-icon">🏅</span>
                        <div class="reward-info">
                            <span class="reward-name">${badgeNames[badge] || badge}</span>
                            <span class="reward-date">Badge earned</span>
                        </div>
                    </div>
                `;
            });
        }

        if (rewardsHTML) {
            rewardsList.innerHTML = rewardsHTML;
        }
    }
}

// ============================================
// PROFILE SCREEN
// ============================================
function updateProfileScreen() {
    const user = Database.getCurrentUser();
    if (!user) return;

    document.getElementById('homeAddressInput').value = user.homeAddress || '';
    document.querySelectorAll('#profileScreen .level-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.level === user.activityLevel));
    document.getElementById('mobilityToggle').checked = user.hasMobilityIssue;
    document.querySelectorAll('#profileInterests .interest-btn').forEach(b =>
        b.classList.toggle('active', (user.interests || []).includes(b.dataset.interest)));
}

function saveProfileChanges() {
    const homeAddress = document.getElementById('homeAddressInput').value.trim();
    const level = document.querySelector('#profileScreen .level-btn.active')?.dataset.level || 'moderate';
    const mobility = document.getElementById('mobilityToggle').checked;
    const interests = Array.from(document.querySelectorAll('#profileInterests .interest-btn.active'))
        .map(b => b.dataset.interest);

    Database.updateUserProfile({ homeAddress, activityLevel: level, hasMobilityIssue: mobility, interests });
    showToast('Profile saved! ✓', '💾');
    updateUserUI();
    checkTransportEligibility();
    loadActivities();
}

// ============================================
// NAVIGATION
// ============================================
function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        AppState.currentScreen = screenId;
    }

    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.remove('active');
        if (b.dataset.screen === screenId) b.classList.add('active');
    });

    const nav = document.querySelector('.bottom-nav');
    const header = document.querySelector('.app-header');
    if (screenId === 'loginScreen' || screenId === 'profileSetupScreen') {
        nav?.classList.add('hidden');
        header?.classList.add('hidden');
    } else {
        nav?.classList.remove('hidden');
        header?.classList.remove('hidden');
    }

    window.scrollTo(0, 0);
}

// ============================================
// NOTIFICATIONS
// ============================================
function updateNotificationBadge() {
    const count = Database.getUnreadCount();
    const badge = document.getElementById('notifBadge');
    if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
}

function loadNotifications() {
    const notifications = Database.getNotifications();
    const container = document.getElementById('notificationList');

    if (notifications.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--gray-600);">No notifications yet</p>';
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
            <span class="notification-icon">${n.icon || '🔔'}</span>
            <div class="notification-content">
                <h4>${n.title}</h4>
                <p>${n.message}</p>
                <span class="notification-time">${formatTimeAgo(n.createdAt)}</span>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            Database.markNotificationRead(item.dataset.id);
            item.classList.remove('unread');
            updateNotificationBadge();
        });
    });
}

// ============================================
// DATE BUTTONS & ACTIVITIES
// ============================================
// Fixed date range: Jan 14, 2026 to Feb 28, 2026
const DEMO_START_DATE = new Date('2026-01-14');
const DEMO_END_DATE = new Date('2026-02-28');

// Get today's date string (YYYY-MM-DD format) - uses real system clock
function getTodayDateStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function generateDateButtons() {
    const container = document.getElementById('dateScroll');
    if (!container) return;
    container.innerHTML = '';

    // Calculate start date based on offset (7 days per page)
    const startDate = new Date(DEMO_START_DATE);
    startDate.setDate(startDate.getDate() + AppState.dateOffset);

    // Ensure we don't go before Jan 14 or after Feb 28
    const maxOffset = Math.floor((DEMO_END_DATE - DEMO_START_DATE) / (1000 * 60 * 60 * 24)) - 6;

    // Update month label based on middle date shown
    const middleDate = new Date(startDate);
    middleDate.setDate(middleDate.getDate() + 3);
    const monthLabel = document.getElementById('currentMonthLabel');
    if (monthLabel) {
        monthLabel.textContent = middleDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        // Skip if out of range
        if (date < DEMO_START_DATE || date > DEMO_END_DATE) continue;

        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const todayStr = getTodayDateStr();
        const isPast = dateStr < todayStr;

        const btn = document.createElement('button');
        btn.className = 'date-btn';
        if (isPast) btn.classList.add('past');
        if (dateStr === todayStr) btn.classList.add('today');
        if (dateStr === AppState.selectedDate) btn.classList.add('active');
        btn.dataset.date = dateStr;
        btn.innerHTML = `<span class="date-day">${dayName}</span><span class="date-num">${dayNum}</span>`;
        btn.addEventListener('click', () => { AppState.selectedDate = dateStr; generateDateButtons(); loadActivities(); });
        container.appendChild(btn);
    }
}

function loadActivities() {
    const container = document.getElementById('activityList');
    const emptyState = document.getElementById('noActivities');
    if (!container) return;

    let activities = Database.getAllActivities();
    const user = Database.getCurrentUser();
    const userLevel = Database.ACTIVITY_LEVELS[user?.activityLevel?.toUpperCase()] || Database.ACTIVITY_LEVELS.MODERATE;

    // Apply date filter first (affects all tabs including "For You")
    if (AppState.selectedDate) activities = activities.filter(a => a.date === AppState.selectedDate);
    if (AppState.selectedLocation !== 'all') activities = activities.filter(a => a.location === AppState.selectedLocation);

    // Then apply type filter
    if (AppState.selectedType === 'recommended') {
        // Show activities matching user's interests (highlighted activities)
        activities = activities.filter(a => user?.interests?.includes(a.category));
    } else if (AppState.selectedType !== 'all') {
        activities = activities.filter(a => a.type === AppState.selectedType);
    }

    activities.sort((a, b) => a.time.localeCompare(b.time));

    if (activities.length === 0) { container.innerHTML = ''; emptyState?.classList.remove('hidden'); return; }
    emptyState?.classList.add('hidden');

    container.innerHTML = activities.map(activity => {
        // Find location object by matching id or iterating values
        const locationEntry = Object.values(Database.LOCATIONS).find(l => l.id === activity.location);
        const location = locationEntry || { icon: '📍', shortName: Translation.get('all') };

        const isRegistered = Database.isRegistered(activity.id);
        const isRecommended = userLevel.types.includes(activity.type) && user?.interests?.includes(activity.category);

        // Time-aware status check
        const todayStr = getTodayDateStr();
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        const isDatePast = activity.date < todayStr;
        const isToday = activity.date === todayStr;
        const hasStarted = isToday && activity.time <= currentTime;
        const hasEnded = isDatePast || (isToday && activity.endTime <= currentTime);

        // Determine button state
        let joinText, isDisabled;
        if (hasEnded) {
            joinText = 'Ended';
            isDisabled = true;
        } else if (hasStarted) {
            joinText = 'In Progress';
            isDisabled = true;
        } else if (isRegistered) {
            joinText = Translation.get('joined');
            isDisabled = false;
        } else {
            joinText = Translation.get('join');
            isDisabled = false;
        }

        // Intensity badge
        const intensityLabels = { low: '🟢 ' + Translation.get('intensityLow'), moderate: '🟡 ' + Translation.get('intensityMod'), high: '🔴 ' + Translation.get('intensityHigh') };
        const intensityBadge = intensityLabels[activity.intensity] || '';

        return `
            <div class="activity-card ${isRecommended ? 'recommended' : ''} ${hasEnded ? 'past' : ''} ${hasStarted && !hasEnded ? 'in-progress' : ''}" data-id="${activity.id}">
                <div class="activity-image" style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);">
                    <span class="activity-emoji">${activity.emoji}</span>
                </div>
                <div class="activity-info">
                    <h4>${activity.name}</h4>
                    <div class="activity-meta">
                        <span class="meta-item">${location.icon} ${location.shortName}</span>
                        <span class="meta-item">🕐 ${formatTime(activity.time)} - ${formatTime(activity.endTime)}</span>
                    </div>
                    <span class="intensity-badge intensity-${activity.intensity || 'low'}">${intensityBadge}</span>
                </div>
                <button class="join-btn ${isRegistered ? 'joined' : ''} ${isDisabled ? 'disabled' : ''}" data-activity-id="${activity.id}" ${isDisabled ? 'disabled' : ''}>
                    ${joinText}
                </button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.join-btn:not(.disabled)').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); toggleRegistration(btn.dataset.activityId); }));
    container.querySelectorAll('.activity-card').forEach(card => card.addEventListener('click', () => showActivityDetail(card.dataset.id)));
}

function loadUpcomingActivities() {
    const container = document.getElementById('upcomingActivities');
    if (!container) return;

    const registrations = Database.getUserRegistrations();
    const now = new Date();
    const todayStr = getTodayDateStr();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    const upcoming = registrations
        .map(r => ({ ...Database.getActivityById(r.activityId), reg: r }))
        .filter(a => {
            if (!a) return false;
            // Future dates are always included
            if (a.date > todayStr) return true;
            // Past dates are always excluded
            if (a.date < todayStr) return false;
            // For today's activities, check if the end time has passed
            return a.endTime > currentTime;
        })
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
        .slice(0, 3);

    if (upcoming.length === 0) {
        container.innerHTML = `<div class="activity-mini-card"><span class="activity-name">No activities scheduled</span></div>`;
        return;
    }

    container.innerHTML = upcoming.map(a => {
        const dateObj = new Date(a.date + 'T00:00:00');
        const dateStr = dateObj.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
        return `
            <div class="activity-mini-card">
                <span class="activity-date">${dateStr}</span>
                <span class="activity-time">${formatTime(a.time)} - ${formatTime(a.endTime)}</span>
                <span class="activity-name">${a.name}</span>
                ${getTypeIcon(a.type)}
            </div>
        `;
    }).join('');
}

function toggleRegistration(activityId) {
    if (Database.isRegistered(activityId)) {
        Database.unregisterFromActivity(activityId);
        showToast(Translation.get('leftActivity'), '👋');
        loadActivities();
        loadUpcomingActivities();
    } else {
        // Safety check: compare user level vs activity intensity
        const user = Database.getCurrentUser();
        const activity = Database.getActivityById(activityId);
        const levelMap = { low: 1, moderate: 2, high: 3 };
        const userLevel = levelMap[user?.activityLevel] || 2;
        const activityLevel = levelMap[activity?.intensity] || 1;

        if (activityLevel > userLevel) {
            // Show warning modal
            AppState.pendingActivityId = activityId;
            document.getElementById('intensityWarningModal')?.classList.remove('hidden');
        } else {
            completeRegistration(activityId);
        }
    }
}

function completeRegistration(activityId) {
    Database.registerForActivity(activityId);
    showToast(Translation.get('joinedActivity'), '✅');
    loadActivities();
    loadUpcomingActivities();
}

function showActivityDetail(activityId) {
    const activity = Database.getActivityById(activityId);
    if (!activity) return;

    const locationEntry = Object.values(Database.LOCATIONS).find(l => l.id === activity.location);
    const location = locationEntry || { icon: '📍', name: 'Unknown Location', address: '' };
    const isRegistered = Database.isRegistered(activityId);
    const mapsUrl = Database.getGoogleMapsUrl(activity.location);

    // Time-aware status check
    const todayStr = getTodayDateStr();
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    const isDatePast = activity.date < todayStr;
    const isToday = activity.date === todayStr;
    const hasStarted = isToday && activity.time <= currentTime;
    const hasEnded = isDatePast || (isToday && activity.endTime <= currentTime);
    const canJoin = !hasStarted && !hasEnded;

    let joinBtnHtml, statusMessage = '';
    if (hasEnded) {
        joinBtnHtml = `<button class="primary-btn disabled" disabled style="background: var(--gray-400); cursor: not-allowed;">🚫 This activity has ended</button>`;
        statusMessage = '<p style="color: var(--gray-500); font-style: italic; margin-bottom: var(--space-md);">⏰ This activity has already ended.</p>';
    } else if (hasStarted) {
        joinBtnHtml = `<button class="primary-btn disabled" disabled style="background: var(--warning); cursor: not-allowed;">🔄 Activity In Progress</button>`;
        statusMessage = '<p style="color: var(--warning); font-style: italic; margin-bottom: var(--space-md);">🎯 This activity is currently happening!</p>';
    } else if (isRegistered) {
        joinBtnHtml = `<button class="primary-btn joined" id="detailJoinBtn" data-id="${activityId}">✓ Already Joined</button>`;
    } else {
        joinBtnHtml = `<button class="primary-btn" id="detailJoinBtn" data-id="${activityId}">📅 Join This Activity</button>`;
    }

    document.getElementById('activityDetailBody').innerHTML = `
        <div class="activity-detail-header">
            <span class="activity-detail-emoji">${activity.emoji}</span>
            <h3>${activity.name}</h3>
            <p class="activity-detail-location">${location.icon} ${location.name}</p>
        </div>
        <div class="activity-detail-info">
            <div class="detail-row"><span>📅</span><span>${formatDate(activity.date)}</span></div>
            <div class="detail-row"><span>🕐</span><span>${formatTime(activity.time)} - ${formatTime(activity.endTime)}</span></div>
            <div class="detail-row">
                <span>📍</span>
                <span><a href="${mapsUrl}" target="_blank" style="color:var(--primary);">${location.address} 🗺️</a></span>
            </div>
            ${activity.instructor ? `<div class="detail-row"><span>👨‍🏫</span><span>${activity.instructor}</span></div>` : ''}
        </div>
        ${statusMessage}
        <p style="margin-bottom: var(--space-lg); color: var(--gray-600);">${activity.description}</p>
        ${joinBtnHtml}
    `;

    if (canJoin) {
        document.getElementById('detailJoinBtn')?.addEventListener('click', () => {
            toggleRegistration(activityId);
            document.getElementById('activityDetailModal').classList.add('hidden');
        });
    }

    document.getElementById('activityDetailModal').classList.remove('hidden');
}

// ============================================
// FEEDBACK
// ============================================
function checkPendingFeedback() {
    const pending = Database.getPendingFeedback();
    const feedbackAlert = document.getElementById('feedbackAlert');
    const feedbackSection = document.getElementById('feedbackSection');
    const feedbackList = document.getElementById('pendingFeedbackList');

    if (pending.length > 0) {
        feedbackAlert?.classList.remove('hidden');
        feedbackSection?.classList.remove('hidden');

        if (feedbackList) {
            feedbackList.innerHTML = pending.map(reg => {
                const activity = Database.getActivityById(reg.activityId);
                if (!activity) return '';
                return `
                    <div class="pending-feedback-item">
                        <span class="activity-emoji">${activity.emoji}</span>
                        <div class="pending-feedback-info">
                            <h4>${activity.name}</h4>
                            <span>${formatDate(activity.date)}</span>
                        </div>
                        <button class="feedback-btn" data-id="${activity.id}">📝 Rate</button>
                    </div>
                `;
            }).join('');

            feedbackList.querySelectorAll('.feedback-btn').forEach(btn => {
                btn.addEventListener('click', () => openFeedbackModal(btn.dataset.id));
            });
        }
    } else {
        feedbackAlert?.classList.add('hidden');
        feedbackSection?.classList.add('hidden');
    }
}

function openFeedbackModal(activityId) {
    const activity = Database.getActivityById(activityId);
    if (!activity) return;
    AppState.currentFeedbackActivity = activityId;
    document.getElementById('feedbackActivityName').textContent = activity.name;
    document.getElementById('feedbackModal').classList.remove('hidden');
}

function submitFeedback() {
    if (!AppState.currentFeedbackActivity) return;
    const enjoyment = document.querySelector('#enjoymentRating .emoji-btn.active')?.dataset.value || 5;
    const joinAgain = document.querySelector('#joinAgain .yn-btn.active')?.dataset.value || 'yes';
    const comments = document.getElementById('feedbackComments').value;

    Database.submitFeedback(AppState.currentFeedbackActivity, {
        enjoyment: parseInt(enjoyment),
        wouldJoinAgain: joinAgain === 'yes',
        comments
    });

    document.getElementById('feedbackModal').classList.add('hidden');
    showToast('Thanks! +20 points 🎉', '✅');
    updateUserUI();
    checkPendingFeedback();
    AppState.currentFeedbackActivity = null;
}

// ============================================
// VOUCHER REDEMPTION
// ============================================
function redeemVoucher() {
    const user = Database.getCurrentUser();
    if (!user || user.points < 200) {
        showToast('Not enough points!', '⚠️');
        return;
    }

    // Generate reference number
    const refNumber = 'SK-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const redeemDate = new Date().toLocaleDateString('en-SG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    // Deduct points
    user.points -= 200;
    user.lastVoucherRef = refNumber;
    user.lastVoucherDate = redeemDate;
    Database.saveCurrentUser(user);

    // Update UI
    updateUserUI();

    // Show voucher screen
    showVoucherScreen(refNumber, redeemDate);
}

function showVoucherScreen(refNumber, redeemDate) {
    document.getElementById('voucherRefNumber').textContent = refNumber;
    document.getElementById('voucherRedeemDate').textContent = redeemDate;
    navigateTo('voucherRedemptionScreen');
    showToast(Translation.get('voucherRedeemed'), '🎫');
}

// ============================================
// TRANSPORT
// ============================================
function checkTransportEligibility() {
    const user = Database.getCurrentUser();
    if (!user) return;
    const eligible = user.hasMobilityIssue;
    document.getElementById('fetchDefault')?.classList.toggle('hidden', !eligible);
    document.getElementById('fetchNotEligible')?.classList.toggle('hidden', eligible);
    document.getElementById('eligibilityTitle').textContent = eligible ? '✅ You are eligible' : 'Transport Service';
}

// ============================================
// HEALTH SCREEN & STATS
// ============================================
function updateHealthScreen() {
    const user = Database.getCurrentUser();
    if (!user) return;

    const registrations = Database.getUserRegistrations();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const weeklyCount = registrations.filter(r => {
        const activity = Database.getActivityById(r.activityId);
        return activity && activity.date >= weekAgo && r.attendanceConfirmed;
    }).length;

    document.getElementById('weeklyActivities').textContent = `${weeklyCount} Activities`;
    document.getElementById('hospitalVisits').textContent = user.hospitalVisits || 0;

    const levelData = Database.ACTIVITY_LEVELS[user.activityLevel?.toUpperCase()] || Database.ACTIVITY_LEVELS.MODERATE;
    const levelDisplay = document.getElementById('currentLevel');
    if (levelDisplay) {
        levelDisplay.querySelector('.level-icon-large').textContent = levelData.icon;
        levelDisplay.querySelector('.level-title').textContent = levelData.name;
        levelDisplay.querySelector('.level-subtitle').textContent = levelData.description;
    }

    // Dynamic Fall Risk
    const fallRisk = Database.calculateFallRisk(user);
    const riskIndicator = document.getElementById('fallRiskIndicator');
    const riskIcon = document.getElementById('fallRiskIcon');
    const riskStatus = document.getElementById('fallRiskStatus');
    const riskDetail = document.getElementById('fallRiskDetail');

    riskIndicator.className = `risk-indicator ${fallRisk}`;

    if (fallRisk === 'high') {
        riskIcon.textContent = '⚠️';
        riskStatus.textContent = Translation.get('highFallRisk');
        riskDetail.textContent = Translation.get('takeCare');
    } else if (fallRisk === 'moderate') {
        riskIcon.textContent = '✋';
        riskStatus.textContent = Translation.get('moderateRisk');
        riskDetail.textContent = Translation.get('beCareful');
    } else {
        riskIcon.textContent = '✅';
        riskStatus.textContent = Translation.get('lowRisk');
        riskDetail.textContent = Translation.get('stayActive');
    }
}

function loadHealthHistory() {
    const stats = Database.getHealthStats();
    if (!stats) return;

    // Blood Pressure
    const bpContainer = document.getElementById('bpHistory');
    if (bpContainer && stats.bloodPressure.length > 0) {
        bpContainer.innerHTML = stats.bloodPressure.slice(0, 5).map(bp => `
            <div class="bp-history-item">
                <span class="bp-value">${bp.systolic}/${bp.diastolic}</span>
                ${bp.pulse ? `<span class="bp-pulse">💓 ${bp.pulse}</span>` : ''}
                <span class="bp-date">${formatDate(bp.date.split('T')[0])}</span>
            </div>
        `).join('');
    } else if (bpContainer) {
        bpContainer.innerHTML = '<p style="color:var(--gray-500);font-size:14px;">No readings yet. Tap + Add to record.</p>';
    }

    // Blood Sugar
    const sugarContainer = document.getElementById('sugarHistory');
    if (sugarContainer && stats.bloodSugar.length > 0) {
        sugarContainer.innerHTML = stats.bloodSugar.slice(0, 5).map(s => `
            <div class="bp-history-item">
                <span class="bp-value">${s.level} mmol/L</span>
                <span class="bp-pulse">${s.type === 'fasting' ? '🌅 Fasting' : '🍽️ After meal'}</span>
                <span class="bp-date">${formatDate(s.date.split('T')[0])}</span>
            </div>
        `).join('');
    } else if (sugarContainer) {
        sugarContainer.innerHTML = '<p style="color:var(--gray-500);font-size:14px;">No readings yet. Tap + Add to record.</p>';
    }

    // Weight
    const weightContainer = document.getElementById('weightHistory');
    if (weightContainer && stats.weight.length > 0) {
        weightContainer.innerHTML = stats.weight.slice(0, 5).map(w => `
            <div class="bp-history-item">
                <span class="bp-value">${w.kg} kg</span>
                <span class="bp-date">${formatDate(w.date.split('T')[0])}</span>
            </div>
        `).join('');
    } else if (weightContainer) {
        weightContainer.innerHTML = '<p style="color:var(--gray-500);font-size:14px;">No readings yet. Tap + Add to record.</p>';
    }
}

function saveBpReading() {
    const systolic = parseInt(document.getElementById('bpSystolic').value);
    const diastolic = parseInt(document.getElementById('bpDiastolic').value);
    const pulse = parseInt(document.getElementById('bpPulse').value) || null;

    if (!systolic || !diastolic) { showToast('Please enter BP values', '⚠️'); return; }

    Database.addBloodPressure(systolic, diastolic, pulse);
    document.getElementById('bpInputModal').classList.add('hidden');
    showToast('BP recorded! 💓', '✅');
    loadHealthHistory();
    updateUserUI();
}

function saveSugarReading() {
    const level = parseFloat(document.getElementById('sugarLevel').value);
    if (!level) { showToast('Please enter sugar level', '⚠️'); return; }

    Database.addBloodSugar(level, AppState.sugarReadingType);
    document.getElementById('sugarInputModal').classList.add('hidden');
    showToast('Blood sugar recorded! 🩸', '✅');
    loadHealthHistory();
}

function saveWeightReading() {
    const kg = parseFloat(document.getElementById('weightKg').value);
    if (!kg) { showToast('Please enter weight', '⚠️'); return; }

    Database.addWeight(kg);
    document.getElementById('weightInputModal').classList.add('hidden');
    showToast('Weight recorded! ⚖️', '✅');
    loadHealthHistory();
}

function playVideo(videoType) {
    const modal = document.getElementById('videoModal');
    const title = document.getElementById('videoTitle');
    const desc = document.getElementById('videoDesc');

    // Demo content
    const content = {
        'app': { title: 'How to Use This App', desc: 'Learn how to navigate SilverKaki, check your points, and join activities.' },
        'join': { title: 'Joining Activities', desc: 'A step-by-step guide to finding and registering for activities.' },
        'transport': { title: 'Using Kaki Cruiser', desc: 'How to request transport, check status, and eligibility rules.' },
        'health': { title: 'Checking Your Health', desc: 'Understanding your health dashboard, fall risk, and recording stats.' }
    };

    const info = content[videoType] || { title: 'Tutorial Video', desc: 'Instructional video.' };
    title.textContent = info.title;
    desc.textContent = info.desc;
    modal.classList.remove('hidden');
}

// ============================================
// FORUM
// ============================================
function loadForumPosts() {
    const container = document.getElementById('forumPosts');
    if (!container) return;

    const posts = Database.getForumPosts(AppState.currentForumCategory);
    const categoryInfo = {
        social: { icon: '☕', bg: '#FFF3E0' },
        diabetes: { icon: '🩺', bg: '#E3F2FD' },
        heart: { icon: '❤️', bg: '#FFEBEE' },
        exercise: { icon: '💪', bg: '#E8F5E9' },
        nutrition: { icon: '🥗', bg: '#FFF8E1' },
        mental: { icon: '🧠', bg: '#F3E5F5' },
        general: { icon: '🏥', bg: '#E0F7FA' }
    };

    if (posts.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--gray-500);">No discussions yet. Start one!</p>';
        return;
    }

    container.innerHTML = posts.map(post => {
        const user = Database.getUserById(post.userId);
        const cat = categoryInfo[post.category] || { icon: '📋', bg: '#F5F5F5' };
        const currentUser = Database.getCurrentUser();
        const isLiked = post.likedBy.includes(currentUser?.id);

        return `
            <div class="forum-post" data-post-id="${post.id}">
                <div class="forum-post-header">
                    <div class="forum-post-avatar">${user?.avatar || '👤'}</div>
                    <div class="forum-post-user">
                        <div class="forum-post-name">${user?.name || 'Anonymous'}</div>
                        <div class="forum-post-time">${formatTimeAgo(post.createdAt)}</div>
                    </div>
                    <span class="forum-post-category" style="background:${cat.bg}">${cat.icon}</span>
                </div>
                <h4 class="forum-post-title">${escapeHtml(post.title)}</h4>
                <p class="forum-post-content">${escapeHtml(post.content).substring(0, 120)}${post.content.length > 120 ? '...' : ''}</p>
                <div class="forum-post-footer">
                    <button class="forum-like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">❤️ ${post.likes}</button>
                    <span>💬 ${post.replies.length} replies</span>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.forum-post').forEach(el => {
        el.addEventListener('click', e => {
            if (!e.target.classList.contains('forum-like-btn')) {
                showPostDetail(el.dataset.postId);
            }
        });
    });

    container.querySelectorAll('.forum-like-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            Database.toggleForumLike(btn.dataset.postId);
            loadForumPosts();
        });
    });
}

function showPostDetail(postId) {
    const post = Database.getForumPost(postId);
    if (!post) return;

    AppState.currentPost = postId;
    const author = Database.getUserById(post.userId);

    const repliesHtml = post.replies.map(r => {
        const replyUser = Database.getUserById(r.userId);
        return `
            <div class="reply-item">
                <div class="reply-header">
                    <span class="reply-avatar">${replyUser?.avatar || '👤'}</span>
                    <span class="reply-name">${replyUser?.name || 'Anonymous'}</span>
                    <span class="reply-time">${formatTimeAgo(r.createdAt)}</span>
                </div>
                <p class="reply-content">${escapeHtml(r.content)}</p>
            </div>
        `;
    }).join('');

    document.getElementById('postDetailContent').innerHTML = `
        <div class="forum-post-header">
            <div class="forum-post-avatar">${author?.avatar || '👤'}</div>
            <div class="forum-post-user">
                <div class="forum-post-name">${author?.name || 'Anonymous'}</div>
                <div class="forum-post-time">${formatTimeAgo(post.createdAt)}</div>
            </div>
        </div>
        <h3 style="margin: 16px 0 8px;">${escapeHtml(post.title)}</h3>
        <p style="color:var(--gray-600); line-height:1.6;">${escapeHtml(post.content)}</p>
        <div class="post-replies">
            <h4>💬 ${post.replies.length} Replies</h4>
            ${repliesHtml || '<p style="color:var(--gray-500);">No replies yet. Be the first!</p>'}
        </div>
    `;

    document.getElementById('postDetailModal').classList.remove('hidden');
}

function submitForumReply() {
    if (!AppState.currentPost) return;
    const content = document.getElementById('replyInput').value.trim();
    if (!content) { showToast('Please write a reply', '⚠️'); return; }

    Database.addForumReply(AppState.currentPost, content);
    document.getElementById('replyInput').value = '';
    showPostDetail(AppState.currentPost);
    showToast('Reply posted! 💬', '✅');
}

function submitForumPost() {
    const category = document.getElementById('postCategory').value;
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!title || !content) { showToast('Please fill in all fields', '⚠️'); return; }

    Database.createForumPost(category, title, content);
    document.getElementById('newPostModal').classList.add('hidden');
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    showToast('Discussion posted! 📤', '✅');
    loadForumPosts();
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Login & Users
    document.getElementById('createNewUserBtn')?.addEventListener('click', showCreateUserScreen);
    document.getElementById('createNewUserBtnModal')?.addEventListener('click', showCreateUserScreen);
    document.getElementById('saveProfileBtn')?.addEventListener('click', createNewUser);

    document.getElementById('closeUserSwitcher')?.addEventListener('click', () => document.getElementById('userSwitcherModal').classList.add('hidden'));

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => { if (btn.dataset.screen) navigateTo(btn.dataset.screen); }));
    document.querySelectorAll('[data-screen]').forEach(btn => {
        if (!btn.classList.contains('nav-btn')) {
            btn.addEventListener('click', () => {
                if (btn.dataset.screen) {
                    navigateTo(btn.dataset.screen);
                    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
                }
            });
        }
    });

    // Date navigation (Jan 14 to Feb 28 = 46 days, show 7 at a time)
    document.getElementById('prevWeek')?.addEventListener('click', () => { AppState.dateOffset = Math.max(0, AppState.dateOffset - 7); generateDateButtons(); });
    document.getElementById('nextWeek')?.addEventListener('click', () => { AppState.dateOffset = Math.min(39, AppState.dateOffset + 7); generateDateButtons(); });

    // Location & type filters
    document.querySelectorAll('.location-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.location-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.selectedLocation = btn.dataset.location;
            loadActivities();
        });
    });
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.selectedType = btn.dataset.filter;
            loadActivities();
        });
    });

    // Gender toggle in setup screen
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Update the avatar preview
            const avatar = btn.dataset.gender === 'female' ? '👵' : '👴';
            const setupAvatar = document.getElementById('setupAvatar');
            if (setupAvatar) setupAvatar.textContent = avatar;
        });
    });

    // Forum
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentForumCategory = btn.dataset.category;
            loadForumPosts();
        });
    });
    document.getElementById('newForumPostBtn')?.addEventListener('click', () => document.getElementById('newPostModal').classList.remove('hidden'));
    document.getElementById('closeNewPost')?.addEventListener('click', () => document.getElementById('newPostModal').classList.add('hidden'));
    document.getElementById('submitForumPost')?.addEventListener('click', submitForumPost);
    document.getElementById('closePostDetail')?.addEventListener('click', () => document.getElementById('postDetailModal').classList.add('hidden'));
    document.getElementById('submitReplyBtn')?.addEventListener('click', submitForumReply);

    // Health stats input
    document.getElementById('closeBpInput')?.addEventListener('click', () => document.getElementById('bpInputModal').classList.add('hidden'));
    document.getElementById('saveBpBtn')?.addEventListener('click', saveBpReading);
    document.getElementById('addSugarBtn')?.addEventListener('click', () => document.getElementById('sugarInputModal').classList.remove('hidden'));
    document.getElementById('closeSugarInput')?.addEventListener('click', () => document.getElementById('sugarInputModal').classList.add('hidden'));
    document.getElementById('saveSugarBtn')?.addEventListener('click', saveSugarReading);
    document.getElementById('addWeightBtn')?.addEventListener('click', () => document.getElementById('weightInputModal').classList.remove('hidden'));
    document.getElementById('closeWeightInput')?.addEventListener('click', () => document.getElementById('weightInputModal').classList.add('hidden'));
    document.getElementById('saveWeightBtn')?.addEventListener('click', saveWeightReading);

    // Video Player
    document.querySelectorAll('.video-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.innerText.toLowerCase();
            let type = 'app';
            if (text.includes('joining')) type = 'join';
            else if (text.includes('booking') || text.includes('cruiser')) type = 'transport';
            else if (text.includes('health')) type = 'health';
            playVideo(type);
        });
    });
    document.getElementById('closeVideoModal')?.addEventListener('click', () => document.getElementById('videoModal').classList.add('hidden'));
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.toggle-btns').querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.sugarReadingType = btn.dataset.type;
        });
    });

    // Kaki Cruiser (Fetch Me) - Tab switching
    document.getElementById('tabToCentre')?.addEventListener('click', () => {
        document.getElementById('tabToCentre').classList.add('active');
        document.getElementById('tabToCentre').style.background = 'var(--primary)';
        document.getElementById('tabToCentre').style.color = 'white';
        document.getElementById('tabToHome').classList.remove('active');
        document.getElementById('tabToHome').style.background = 'white';
        document.getElementById('tabToHome').style.color = 'var(--primary)';
        document.getElementById('toCentreForm').classList.remove('hidden');
        document.getElementById('toHomeForm').classList.add('hidden');
    });
    document.getElementById('tabToHome')?.addEventListener('click', () => {
        document.getElementById('tabToHome').classList.add('active');
        document.getElementById('tabToHome').style.background = 'var(--primary)';
        document.getElementById('tabToHome').style.color = 'white';
        document.getElementById('tabToCentre').classList.remove('active');
        document.getElementById('tabToCentre').style.background = 'white';
        document.getElementById('tabToCentre').style.color = 'var(--primary)';
        document.getElementById('toHomeForm').classList.remove('hidden');
        document.getElementById('toCentreForm').classList.add('hidden');
    });

    // Kaki Cruiser - Request ride
    document.getElementById('requestFetchBtn')?.addEventListener('click', () => {
        const isToCentre = document.getElementById('tabToCentre').classList.contains('active');
        let dest;
        if (isToCentre) {
            dest = document.getElementById('destinationLocationToCentre').value;
        } else {
            dest = document.getElementById('destinationLocationToHome').value;
        }

        // Get display name
        let displayName;
        if (dest === 'home') {
            displayName = 'My Home';
        } else {
            const location = Object.values(Database.LOCATIONS).find(l => l.id === dest);
            displayName = location ? location.shortName : 'Selected Location';
        }

        document.getElementById('destinationDisplay').textContent = displayName;
        document.getElementById('fetchDefault').classList.add('hidden');
        document.getElementById('fetchWaiting').classList.remove('hidden');
        showToast('Kaki Cruiser requested! 🚗', '✅');
    });
    document.getElementById('cancelFetch')?.addEventListener('click', () => {
        document.getElementById('fetchWaiting').classList.add('hidden');
        document.getElementById('fetchDefault').classList.remove('hidden');
    });
    document.getElementById('updateMobilityBtn')?.addEventListener('click', () => navigateTo('profileScreen'));

    // Profile
    document.querySelectorAll('#profileScreen .level-btn, #profileSetupScreen .level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.activity-level-selector').querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    document.querySelectorAll('.mobility-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.mobility-selector').querySelectorAll('.mobility-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    document.querySelectorAll('.interest-btn').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('active')));
    document.getElementById('saveProfileChanges')?.addEventListener('click', saveProfileChanges);

    // Feedback
    document.querySelectorAll('#enjoymentRating .emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#enjoymentRating .emoji-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    document.querySelectorAll('#joinAgain .yn-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#joinAgain .yn-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    document.getElementById('submitFeedback')?.addEventListener('click', submitFeedback);
    document.getElementById('closeFeedbackModal')?.addEventListener('click', () => document.getElementById('feedbackModal').classList.add('hidden'));
    document.getElementById('goToFeedbackBtn')?.addEventListener('click', () => navigateTo('learnScreen'));

    // Modals
    document.getElementById('notificationBtn')?.addEventListener('click', () => { loadNotifications(); document.getElementById('notificationModal').classList.remove('hidden'); });
    document.getElementById('closeNotificationModal')?.addEventListener('click', () => document.getElementById('notificationModal').classList.add('hidden'));
    document.getElementById('helpBtn')?.addEventListener('click', () => document.getElementById('helpModal').classList.remove('hidden'));
    document.getElementById('closeHelpModal')?.addEventListener('click', () => document.getElementById('helpModal').classList.add('hidden'));
    document.getElementById('closeActivityDetail')?.addEventListener('click', () => document.getElementById('activityDetailModal').classList.add('hidden'));
    document.getElementById('closeAttendanceModal')?.addEventListener('click', () => document.getElementById('attendanceModal').classList.add('hidden'));
    document.getElementById('closeTimerModal')?.addEventListener('click', () => document.getElementById('timerModal').classList.add('hidden'));
    document.getElementById('callNow')?.addEventListener('click', () => { document.getElementById('helpModal').classList.add('hidden'); showToast('Calling staff...', '📞'); });
    document.getElementById('callStaffBtn')?.addEventListener('click', () => showToast('Calling staff...', '📞'));
    document.getElementById('scheduleCheckin')?.addEventListener('click', () => showToast('Check-in scheduled!', '📅'));

    // Modal backdrop close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
    });
    // Logout and Reset
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        Database.logout();
        window.location.reload();
    });

    document.getElementById('resetDataBtn')?.addEventListener('click', () => {
        if (confirm(Translation.get('confirmReset') || 'Reset ALL demo data? This will reload the app.')) {
            localStorage.clear();
            window.location.reload();
        }
    });

    // Voucher Redemption
    document.getElementById('redeemVoucherBtn')?.addEventListener('click', redeemVoucher);

    // View Past Voucher
    document.getElementById('viewVoucherBtn')?.addEventListener('click', () => {
        const user = Database.getCurrentUser();
        if (user && user.lastVoucherRef) {
            showVoucherScreen(user.lastVoucherRef, user.lastVoucherDate);
        }
    });

    // Replay Onboarding
    document.getElementById('replayOnboardingBtn')?.addEventListener('click', () => {
        localStorage.removeItem('silverkaki_onboarding_complete');
        navigateTo('homeScreen');
        startOnboarding();
    });

    // Intensity Warning Modal
    document.getElementById('closeIntensityWarning')?.addEventListener('click', () => document.getElementById('intensityWarningModal').classList.add('hidden'));
    document.getElementById('cancelIntensityJoin')?.addEventListener('click', () => document.getElementById('intensityWarningModal').classList.add('hidden'));
    document.getElementById('confirmIntensityJoin')?.addEventListener('click', () => {
        document.getElementById('intensityWarningModal').classList.add('hidden');
        if (AppState.pendingActivityId) {
            completeRegistration(AppState.pendingActivityId);
            AppState.pendingActivityId = null;
        }
    });

    // Contact Driver
    document.getElementById('contactDriverBtn')?.addEventListener('click', () => {
        document.getElementById('contactDriverModal')?.classList.remove('hidden');
    });
    document.getElementById('closeContactDriver')?.addEventListener('click', () => document.getElementById('contactDriverModal').classList.add('hidden'));
    document.getElementById('callDriver')?.addEventListener('click', () => {
        document.getElementById('contactDriverModal').classList.add('hidden');
        showToast(Translation.get('callingDriver'), '📞');
    });
    document.getElementById('messageDriver')?.addEventListener('click', () => {
        document.getElementById('contactDriverModal').classList.add('hidden');
        showToast(Translation.get('messageSent'), '💬');
    });
}

// ============================================
// LANGUAGE SWITCHING
// ============================================
function updateLanguageButtons() {
    const currentLang = Translation.currentLang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
}

function setupLanguageListeners() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            Translation.setLanguage(lang);
            updateLanguageButtons();

            // Force full re-render of dynamic content to avoid mixed languages
            if (Database.isLoggedIn()) {
                initLoggedInUser();
            }

            showToast(Translation.get('welcomeBack'), '🌐');
        });
    });
}

// ============================================
// ONBOARDING FLOW
// ============================================
function checkAndStartOnboarding() {
    const onboardingComplete = localStorage.getItem('silverkaki_onboarding_complete');
    if (!onboardingComplete) {
        // Delay slightly to let the UI render
        setTimeout(() => {
            startOnboarding();
        }, 500);
    }
}

function startOnboarding() {
    AppState.onboardingStep = 0;
    AppState.onboardingActive = true;
    document.getElementById('onboardingOverlay').classList.remove('hidden');
    showOnboardingStep(0);
}

function showOnboardingStep(stepIndex) {
    const step = ONBOARDING_STEPS[stepIndex];
    if (!step) {
        completeOnboarding();
        return;
    }

    const overlay = document.getElementById('onboardingOverlay');
    const spotlight = document.getElementById('onboardingSpotlight');
    const tooltip = document.getElementById('onboardingTooltip');
    const icon = document.getElementById('onboardingIcon');
    const title = document.getElementById('onboardingTitle');
    const desc = document.getElementById('onboardingDesc');
    const nextBtn = document.getElementById('onboardingNext');
    const progressDots = document.querySelectorAll('.progress-dot');

    // Update content
    icon.textContent = step.icon;
    title.textContent = Translation.get(step.titleKey);
    desc.textContent = Translation.get(step.descKey);

    // Update button text
    const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
    nextBtn.textContent = isLastStep ? Translation.get('finish') : Translation.get('next');

    // Update progress dots
    progressDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === stepIndex);
    });

    // Handle spotlight
    if (step.target) {
        const targetEl = document.querySelector(step.target);
        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            const padding = 8;

            spotlight.style.display = 'block';
            spotlight.style.top = (rect.top - padding) + 'px';
            spotlight.style.left = (rect.left - padding) + 'px';
            spotlight.style.width = (rect.width + padding * 2) + 'px';
            spotlight.style.height = (rect.height + padding * 2) + 'px';

            // Position tooltip - check if it would go off-screen
            const tooltipHeight = 200; // Approximate height of tooltip
            const tooltipWidth = 320;
            const margin = 16;

            let tooltipTop, tooltipLeft;

            // Check if tooltip fits below target
            if (rect.bottom + margin + tooltipHeight < window.innerHeight) {
                // Position below
                tooltipTop = rect.bottom + margin;
            } else {
                // Position above target
                tooltipTop = rect.top - tooltipHeight - margin;
                // Ensure it doesn't go above viewport
                if (tooltipTop < margin) {
                    tooltipTop = margin;
                }
            }

            // Horizontal positioning - center on target but keep on screen
            tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            tooltipLeft = Math.max(margin, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - margin));

            tooltip.style.top = tooltipTop + 'px';
            tooltip.style.left = tooltipLeft + 'px';
            tooltip.style.transform = '';
        }
    } else {
        // No target - center the tooltip
        spotlight.style.display = 'none';
        tooltip.style.top = '50%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
    }

    AppState.onboardingStep = stepIndex;
}

function nextOnboardingStep() {
    const nextStep = AppState.onboardingStep + 1;
    if (nextStep >= ONBOARDING_STEPS.length) {
        completeOnboarding();
    } else {
        // Reset tooltip transform if it was centered
        document.getElementById('onboardingTooltip').style.transform = '';
        showOnboardingStep(nextStep);
    }
}

function completeOnboarding() {
    AppState.onboardingActive = false;
    localStorage.setItem('silverkaki_onboarding_complete', 'true');
    document.getElementById('onboardingOverlay').classList.add('hidden');
    showToast(Translation.get('welcomeBack'), '🎉');
}

function setupOnboardingListeners() {
    document.getElementById('onboardingNext')?.addEventListener('click', nextOnboardingStep);
    document.getElementById('onboardingSkip')?.addEventListener('click', completeOnboarding);
}

// ============================================
// UTILITIES
// ============================================
function showToast(message, icon = '✅') {
    const toast = document.getElementById('toast');
    toast.querySelector('.toast-icon').textContent = icon;
    toast.querySelector('.toast-message').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function updateGreeting() {
    const hour = new Date().getHours();
    const el = document.getElementById('greetingTime');
    if (el) {
        let greetingKey = 'greetingEvening';
        if (hour < 12) greetingKey = 'greetingMorning';
        else if (hour < 17) greetingKey = 'greetingAfternoon';
        el.textContent = Translation.get(greetingKey);
    }
}

function formatTime(time) {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTimeAgo(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function getTypeIcon(type) { return { sit: '🪑', stand: '🧍', walk: '🚶' }[type] || '📅'; }
function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', initApp);
if (document.readyState !== 'loading') initApp();

/**
 * SilverKaki Database Module
 * Simulates a backend connection with LocalStorage
 */

const Database = {
    // ============================================
    // STORAGE KEYS
    // ============================================
    KEYS: {
        USERS: 'hk_users',
        CURRENT_USER_ID: 'hk_current_user_id',
        ACTIVITIES: 'hk_activities',
        REGISTRATIONS: 'hk_registrations',
        NOTIFICATIONS: 'hk_notifications',
        FEEDBACK: 'hk_feedback',
        TRANSPORT_REQUESTS: 'hk_transport',
        FORUM_POSTS: 'hk_forum_posts',
        FORUM_TOPICS: 'hk_forum_topics'
    },

    // ============================================
    // LOCATIONS WITH COORDINATES FOR GOOGLE MAPS
    // ============================================
    LOCATIONS: {
        CARE_CORNER: {
            id: 'care_corner',
            name: 'Care Corner AAC (WL16)',
            shortName: 'Care Corner',
            address: 'Blk 16 Marsiling Ln, #01-195, Singapore 730016',
            icon: '💙',
            lat: 1.4425, // Approximate for Marsiling Ln
            lng: 103.7780
        },
        NTUC_DAYCARE: {
            id: 'ntuc_daycare',
            name: 'NTUC Health Senior Day Care (Woodlands St 13)',
            shortName: 'NTUC Day Care',
            address: '172 Woodlands Street 13, #01-303, Singapore 730172',
            icon: '🏢',
            lat: 1.4360, // Approximate for Woodlands St 13
            lng: 103.7715
        },
        SUNLOVE: {
            id: 'sunlove_marsiling',
            name: 'Sunlove Marsiling Senior Activity Centre',
            shortName: 'Sunlove Marsiling',
            address: '3 Marsiling Rd, Singapore 730003',
            icon: '🌻',
            lat: 1.4388,
            lng: 103.7731
        },
        NTUC_AAC: {
            id: 'ntuc_aac',
            name: 'NTUC Health Active Ageing Centre (Marsiling Rd)',
            shortName: 'NTUC AAC',
            address: '180A Marsiling Rd, #01-2208, S 731180',
            icon: '🏥',
            lat: 1.4395,
            lng: 103.7745
        }
    },

    // Forum topics for community discussions
    FORUM_CATEGORIES: [
        { id: 'social', name: 'Social & Chat', icon: '☕', color: '#FFF3E0' },
        { id: 'diabetes', name: 'Diabetes Management', icon: '🩺', color: '#E3F2FD' },
        { id: 'heart', name: 'Heart Health', icon: '❤️', color: '#FFEBEE' },
        { id: 'exercise', name: 'Exercise Tips', icon: '💪', color: '#E8F5E9' },
        { id: 'nutrition', name: 'Healthy Eating', icon: '🥗', color: '#FFF8E1' },
        { id: 'mental', name: 'Mental Wellness', icon: '🧠', color: '#F3E5F5' },
        { id: 'general', name: 'General Health', icon: '🏥', color: '#E0F7FA' }
    ],

    // ============================================
    // ACTIVITY LEVELS
    // ============================================
    ACTIVITY_LEVELS: {
        LOW: { id: 'low', name: 'Low Activity', description: 'Prefer seated activities', icon: '🪑', types: ['sit'] },
        MODERATE: { id: 'moderate', name: 'Moderate Activity', description: 'Can stand and do light exercise', icon: '🧍', types: ['sit', 'stand'] },
        HIGH: { id: 'high', name: 'High Activity', description: 'Enjoy walking and active exercises', icon: '🚶', types: ['sit', 'stand', 'walk'] }
    },

    // ============================================
    // INITIALIZATION
    // ============================================
    init() {
        // Clear old data if version changed
        const CURRENT_VERSION = 'v8_all_days_guaranteed';
        if (localStorage.getItem('hk_db_version') !== CURRENT_VERSION) {
            localStorage.removeItem(this.KEYS.ACTIVITIES);
            localStorage.setItem('hk_db_version', CURRENT_VERSION);
            console.log('🔄 Database updated to new version');
        }

        if (!localStorage.getItem(this.KEYS.ACTIVITIES)) {
            this.seedActivities();
        }
        if (!localStorage.getItem(this.KEYS.USERS)) {
            localStorage.setItem(this.KEYS.USERS, JSON.stringify([]));
        }

        const users = this.getAllUsers();
        if (users.length === 0) {
            this.createDemoUsers();
        }



        // Seed demo registrations with pre-completed activity
        this.seedDemoRegistrations();

        // Seed forum posts
        if (!localStorage.getItem(this.KEYS.FORUM_POSTS)) {
            this.seedForumPosts();
        }

        this.generateMatchingNotifications();
        console.log('📦 Database initialized');
    },

    // ============================================
    // DEMO DATA WITH PRE-COMPLETED ACTIVITIES
    // ============================================
    createDemoUsers() {
        const yesterday = new Date(Date.now() - 86400000);
        const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

        const demoUsers = [
            {
                id: 'user_001',
                name: 'Uncle Tan',
                phone: '9123 4567',
                homeAddress: 'Blk 123 Marsiling Drive #08-123',
                gender: 'male',
                activityLevel: 'moderate',
                hasMobilityIssue: true,
                bloodPressure: [
                    { date: new Date().toISOString(), systolic: 120, diastolic: 80, pulse: 72 },
                    { date: yesterday.toISOString(), systolic: 125, diastolic: 82, pulse: 75 },
                    { date: twoDaysAgo.toISOString(), systolic: 118, diastolic: 78, pulse: 70 }
                ],
                bloodSugar: [
                    { date: new Date().toISOString(), level: 5.8, type: 'fasting' },
                    { date: yesterday.toISOString(), level: 7.2, type: 'after_meal' }
                ],
                weight: [
                    { date: new Date().toISOString(), kg: 68 },
                    { date: twoDaysAgo.toISOString(), kg: 68.5 }
                ],
                hospitalVisits: 1,
                points: 150,
                joinedDate: '2025-10-01',
                interests: ['tai-chi', 'art', 'singing'],
                badges: ['first_timer', 'active_star', 'social_bee']
            },
            {
                id: 'user_002',
                name: 'Auntie Mary',
                phone: '9234 5678',
                homeAddress: 'Blk 456 Marsiling Road #05-88',
                gender: 'female',
                activityLevel: 'high',
                hasMobilityIssue: false,
                bloodPressure: [
                    { date: new Date().toISOString(), systolic: 115, diastolic: 75, pulse: 68 }
                ],
                bloodSugar: [],
                weight: [{ date: new Date().toISOString(), kg: 55 }],
                hospitalVisits: 0,
                points: 280,
                joinedDate: '2025-08-15',
                interests: ['dance', 'exercise', 'cooking'],
                badges: ['first_timer', 'active_star', 'social_bee', 'super_active']
            },
            {
                id: 'user_003',
                name: 'Uncle Lim',
                phone: '9345 6789',
                homeAddress: 'Blk 789 Marsiling Lane #12-345',
                gender: 'male',
                activityLevel: 'low',
                hasMobilityIssue: true,
                bloodPressure: [
                    { date: new Date().toISOString(), systolic: 140, diastolic: 90, pulse: 78 }
                ],
                bloodSugar: [
                    { date: new Date().toISOString(), level: 8.5, type: 'fasting' }
                ],
                weight: [{ date: new Date().toISOString(), kg: 75 }],
                hospitalVisits: 2,
                points: 80,
                joinedDate: '2025-11-01',
                interests: ['games', 'singing', 'education'],
                badges: ['first_timer']
            }
        ];

        localStorage.setItem(this.KEYS.USERS, JSON.stringify(demoUsers));
        // Do NOT auto-login - user must select profile on login screen
        return demoUsers;
    },

    // Seed pre-completed activity for feedback demo
    seedDemoRegistrations() {
        const existing = localStorage.getItem(this.KEYS.REGISTRATIONS);
        if (existing) return;

        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Create a past activity for Uncle Tan that needs feedback
        const demoRegs = [
            {
                id: 'reg_demo_1',
                userId: 'user_001',
                activityId: `games-${yesterday}`,
                registeredAt: new Date(Date.now() - 2 * 86400000).toISOString(),
                attended: true,
                attendanceConfirmed: true,
                pointsAwarded: true,
                feedbackCompleted: false,
                feedbackUnlocked: true  // Ready for feedback!
            }
        ];

        localStorage.setItem(this.KEYS.REGISTRATIONS, JSON.stringify(demoRegs));
    },

    // ============================================
    // FORUM POSTS
    // ============================================
    seedForumPosts() {
        const posts = [
            {
                id: 'post_001',
                userId: 'user_002',
                category: 'diabetes',
                title: 'Tips for managing sugar levels after meals',
                content: 'I found that taking a 15-minute walk after meals really helps keep my blood sugar stable. Anyone else tried this? 🚶‍♀️',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                likes: 12,
                likedBy: ['user_001', 'user_003'],
                replies: [
                    {
                        id: 'reply_001',
                        userId: 'user_001',
                        content: 'Yes! My doctor recommended the same thing. Even 10 minutes helps!',
                        createdAt: new Date(Date.now() - 1800000).toISOString(),
                        likes: 5
                    }
                ]
            },
            {
                id: 'post_002',
                userId: 'user_003',
                category: 'heart',
                title: 'High blood pressure - what works for you?',
                content: 'My BP has been a bit high lately (140/90). Besides medication, what lifestyle changes helped you? Looking for advice from seniors who understand. 💓',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                likes: 8,
                likedBy: ['user_002'],
                replies: [
                    {
                        id: 'reply_002',
                        userId: 'user_002',
                        content: 'Reducing salt made a big difference for me. Also doing Tai Chi at the centre helps with stress!',
                        createdAt: new Date(Date.now() - 43200000).toISOString(),
                        likes: 6
                    },
                    {
                        id: 'reply_003',
                        userId: 'user_001',
                        content: 'Sleep is very important! I noticed my BP is higher when I don\'t sleep well.',
                        createdAt: new Date(Date.now() - 21600000).toISOString(),
                        likes: 4
                    }
                ]
            },
            {
                id: 'post_003',
                userId: 'user_001',
                category: 'exercise',
                title: 'Chair exercises for those with knee problems',
                content: 'For those of us with bad knees, Chair Yoga at NTUC Marsiling is excellent! You can exercise without straining your joints. Highly recommend! 🧘',
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                likes: 15,
                likedBy: ['user_002', 'user_003'],
                replies: []
            },
            {
                id: 'post_004',
                userId: 'user_002',
                category: 'nutrition',
                title: 'Easy healthy recipes for seniors',
                content: 'Just learned to make steamed fish with ginger at the cooking class. So tasty and good for the heart! Who else enjoys the cooking sessions? 🍳',
                createdAt: new Date(Date.now() - 259200000).toISOString(),
                likes: 20,
                likedBy: ['user_001'],
                replies: [
                    {
                        id: 'reply_004',
                        userId: 'user_001',
                        content: 'The cooking classes are wonderful! I learned to reduce oil in my cooking.',
                        createdAt: new Date(Date.now() - 172800000).toISOString(),
                        likes: 3
                    }
                ]
            },
            {
                id: 'post_005',
                userId: 'user_003',
                category: 'mental',
                title: 'Feeling lonely sometimes - anyone else?',
                content: 'Since my wife passed, I sometimes feel lonely at home. Coming to the centre and playing mahjong with friends really helps. Don\'t be shy to come! 🤗',
                createdAt: new Date(Date.now() - 345600000).toISOString(),
                likes: 25,
                likedBy: ['user_001', 'user_002'],
                replies: [
                    {
                        id: 'reply_005',
                        userId: 'user_002',
                        content: 'Thank you for sharing Uncle Lim. We\'re all here for each other! ❤️',
                        createdAt: new Date(Date.now() - 259200000).toISOString(),
                        likes: 10
                    }
                ]
            }
        ];

        localStorage.setItem(this.KEYS.FORUM_POSTS, JSON.stringify(posts));
    },

    getForumPosts(category = null) {
        const data = localStorage.getItem(this.KEYS.FORUM_POSTS);
        const posts = data ? JSON.parse(data) : [];
        if (category && category !== 'all') {
            return posts.filter(p => p.category === category);
        }
        return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    getForumPost(postId) {
        const posts = this.getForumPosts();
        return posts.find(p => p.id === postId);
    },

    createForumPost(category, title, content) {
        const posts = this.getForumPosts();
        const user = this.getCurrentUser();
        if (!user) return null;

        const newPost = {
            id: `post_${Date.now()}`,
            userId: user.id,
            category,
            title,
            content,
            createdAt: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            replies: []
        };

        posts.unshift(newPost);
        localStorage.setItem(this.KEYS.FORUM_POSTS, JSON.stringify(posts));
        return newPost;
    },

    addForumReply(postId, content) {
        const posts = this.getForumPosts();
        const user = this.getCurrentUser();
        if (!user) return null;

        const post = posts.find(p => p.id === postId);
        if (!post) return null;

        const reply = {
            id: `reply_${Date.now()}`,
            userId: user.id,
            content,
            createdAt: new Date().toISOString(),
            likes: 0
        };

        post.replies.push(reply);
        localStorage.setItem(this.KEYS.FORUM_POSTS, JSON.stringify(posts));
        return reply;
    },

    toggleForumLike(postId) {
        const posts = this.getForumPosts();
        const user = this.getCurrentUser();
        if (!user) return;

        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const idx = post.likedBy.indexOf(user.id);
        if (idx >= 0) {
            post.likedBy.splice(idx, 1);
            post.likes--;
        } else {
            post.likedBy.push(user.id);
            post.likes++;
        }

        localStorage.setItem(this.KEYS.FORUM_POSTS, JSON.stringify(posts));
        return post.likes;
    },

    // ============================================
    // HEALTH STATS INPUT
    // ============================================
    addBloodPressure(systolic, diastolic, pulse = null) {
        const user = this.getCurrentUser();
        if (!user) return null;

        user.bloodPressure = user.bloodPressure || [];
        user.bloodPressure.unshift({
            date: new Date().toISOString(),
            systolic,
            diastolic,
            pulse
        });

        // Keep last 30 readings
        user.bloodPressure = user.bloodPressure.slice(0, 30);
        this.saveCurrentUser(user);

        // Check for high BP and add notification
        if (systolic >= 140 || diastolic >= 90) {
            this.addNotification({
                type: 'health_alert',
                title: '⚠️ Blood Pressure Alert',
                message: `Your BP ${systolic}/${diastolic} is elevated. Consider consulting your doctor.`,
                icon: '🩺'
            });
        }

        return user.bloodPressure[0];
    },

    addBloodSugar(level, type = 'fasting') {
        const user = this.getCurrentUser();
        if (!user) return null;

        user.bloodSugar = user.bloodSugar || [];
        user.bloodSugar.unshift({
            date: new Date().toISOString(),
            level,
            type
        });

        user.bloodSugar = user.bloodSugar.slice(0, 30);
        this.saveCurrentUser(user);

        // Check for high sugar
        const threshold = type === 'fasting' ? 7.0 : 11.0;
        if (level >= threshold) {
            this.addNotification({
                type: 'health_alert',
                title: '⚠️ Blood Sugar Alert',
                message: `Your ${type === 'fasting' ? 'fasting' : 'after-meal'} sugar ${level} mmol/L is elevated.`,
                icon: '🩸'
            });
        }

        return user.bloodSugar[0];
    },

    addWeight(kg) {
        const user = this.getCurrentUser();
        if (!user) return null;

        user.weight = user.weight || [];
        user.weight.unshift({
            date: new Date().toISOString(),
            kg
        });

        user.weight = user.weight.slice(0, 30);
        this.saveCurrentUser(user);
        return user.weight[0];
    },

    getHealthStats() {
        const user = this.getCurrentUser();
        if (!user) return null;

        return {
            bloodPressure: user.bloodPressure || [],
            bloodSugar: user.bloodSugar || [],
            weight: user.weight || []
        };
    },

    // ============================================
    // USER MANAGEMENT
    // ============================================
    getAllUsers() {
        const data = localStorage.getItem(this.KEYS.USERS);
        return data ? JSON.parse(data) : [];
    },

    getUserById(userId) {
        const users = this.getAllUsers();
        return users.find(u => u.id === userId);
    },

    getCurrentUserId() {
        return localStorage.getItem(this.KEYS.CURRENT_USER_ID);
    },

    setCurrentUserId(userId) {
        localStorage.setItem(this.KEYS.CURRENT_USER_ID, userId);
    },

    getCurrentUser() {
        const userId = this.getCurrentUserId();
        if (!userId) return null;
        return this.getUserById(userId);
    },

    saveUser(user) {
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.id === user.id);
        if (index >= 0) {
            users[index] = user;
        } else {
            users.push(user);
        }
        localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
    },

    saveCurrentUser(user) {
        this.saveUser(user);
    },

    createNewUser(userData) {
        const newUser = {
            id: `user_${Date.now()}`,
            name: userData.name || 'New User',
            phone: userData.phone || '',
            homeAddress: userData.homeAddress || '',
            avatar: userData.avatar || '👴',
            activityLevel: userData.activityLevel || 'moderate',
            hasMobilityIssue: userData.hasMobilityIssue || false,
            bloodPressure: [],
            bloodSugar: [],
            weight: [],
            hospitalVisits: 0,
            points: 0,
            joinedDate: new Date().toISOString().split('T')[0],
            interests: userData.interests || [],
            badges: ['first_timer']
        };

        this.saveUser(newUser);
        this.setCurrentUserId(newUser.id);

        this.addNotification({
            type: 'welcome',
            title: 'Welcome to SilverKaki! 🎉',
            message: 'Start by exploring activities and joining ones you like!',
            icon: '🏡'
        });

        return newUser;
    },

    switchUser(userId) {
        const user = this.getUserById(userId);
        if (user) {
            this.setCurrentUserId(userId);
            this.generateMatchingNotifications();
            return user;
        }
        return null;
    },

    logout() {
        localStorage.removeItem(this.KEYS.CURRENT_USER_ID);
    },

    isLoggedIn() {
        return !!this.getCurrentUserId();
    },

    updateUserProfile(updates) {
        const user = this.getCurrentUser();
        if (!user) return null;
        const updatedUser = { ...user, ...updates };
        this.saveCurrentUser(updatedUser);
        return updatedUser;
    },

    addUserPoints(points, reason) {
        const user = this.getCurrentUser();
        if (!user) return 0;
        user.points = (user.points || 0) + points;
        this.saveCurrentUser(user);
        console.log(`➕ Added ${points} points: ${reason}`);
        return user.points;
    },

    // ============================================
    // ACTIVITIES
    // ============================================
    seedActivities() {
        const activities = [];

        // Fixed demo period: Jan 14, 2026 to Feb 28, 2026
        // Use explicit year/month/day to avoid timezone issues
        const startDate = new Date(2026, 0, 14); // Jan 14, 2026 (month is 0-indexed)
        const endDate = new Date(2026, 1, 28);   // Feb 28, 2026

        // Loop through each day
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const date = new Date(currentDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // Special Event: Valentine's Day
            const isValentines = date.getMonth() === 1 && date.getDate() === 14; // Feb 14
            if (isValentines) {
                activities.push({
                    id: `vday-${dateStr}`,
                    name: '💖 Valentine\'s Friendship Party',
                    category: 'social',
                    type: 'sit',
                    intensity: 'low',
                    date: dateStr,
                    time: '14:00',
                    endTime: '17:00',
                    duration: 180,
                    location: 'care_corner',
                    description: 'Celebrate friendship with tea, cake, and songs!',
                    maxParticipants: 50,
                    currentParticipants: 12,
                    instructor: 'All Staff',
                    emoji: '💝'
                });
            }

            // Morning Tai Chi (Mon, Wed, Fri, Sat)
            if ([1, 3, 5, 6].includes(date.getDay())) {
                activities.push({
                    id: `tai-chi-${dateStr}`,
                    name: 'Morning Tai Chi',
                    category: 'tai-chi',
                    type: 'stand',
                    intensity: 'moderate',
                    date: dateStr,
                    time: '09:00',
                    endTime: '11:00',
                    duration: 120,
                    location: 'ntuc_aac',
                    description: 'Gentle Tai Chi movements to improve balance and flexibility',
                    maxParticipants: 20,
                    currentParticipants: Math.floor(Math.random() * 15) + 3,
                    instructor: 'Master Lee',
                    emoji: '🧘'
                });
            }

            // Art & Craft (Tue, Thu)
            if ([2, 4].includes(date.getDay())) {
                activities.push({
                    id: `art-${dateStr}`,
                    name: 'Art & Craft Session',
                    category: 'art',
                    type: 'sit',
                    intensity: 'low',
                    date: dateStr,
                    time: '10:30',
                    endTime: '12:30',
                    duration: 120,
                    location: 'care_corner',
                    description: 'Express your creativity with painting and crafts',
                    maxParticipants: 15,
                    currentParticipants: Math.floor(Math.random() * 10) + 2,
                    instructor: 'Ms. Tan',
                    emoji: '🎨'
                });
            }

            // Chair Yoga (Mon, Wed, Fri)
            if ([1, 3, 5].includes(date.getDay())) {
                activities.push({
                    id: `chair-yoga-${dateStr}`,
                    name: 'Chair Yoga',
                    category: 'yoga',
                    type: 'sit',
                    intensity: 'low',
                    date: dateStr,
                    time: '11:00',
                    endTime: '13:00',
                    duration: 120,
                    location: 'ntuc_daycare',
                    description: 'Gentle yoga stretches done while seated',
                    maxParticipants: 20,
                    currentParticipants: Math.floor(Math.random() * 12) + 5,
                    instructor: 'Coach Mei',
                    emoji: '🧘‍♀️'
                });
            }

            // Karaoke (Tue, Sat)
            if ([2, 6].includes(date.getDay())) {
                activities.push({
                    id: `karaoke-${dateStr}`,
                    name: 'Karaoke Session',
                    category: 'singing',
                    type: 'sit',
                    intensity: 'low',
                    date: dateStr,
                    time: '14:00',
                    endTime: '16:00',
                    duration: 120,
                    location: 'sunlove_marsiling',
                    description: 'Sing your favorite oldies with friends!',
                    maxParticipants: 25,
                    currentParticipants: Math.floor(Math.random() * 18) + 5,
                    instructor: null,
                    emoji: '🎤'
                });
            }

            // Board Games (Daily)
            activities.push({
                id: `games-${dateStr}`,
                name: 'Board Games & Mahjong',
                category: 'games',
                type: 'sit',
                intensity: 'low',
                date: dateStr,
                time: '15:00',
                endTime: '17:00',
                duration: 120,
                location: 'care_corner',
                description: 'Play mahjong, chess, and other games with friends',
                maxParticipants: 30,
                currentParticipants: Math.floor(Math.random() * 20) + 8,
                instructor: null,
                emoji: '🀄'
            });

            // Morning Tea Social (Daily) - ensures every day has an activity
            activities.push({
                id: `tea-${dateStr}`,
                name: 'Morning Tea Social',
                category: 'social',
                type: 'sit',
                intensity: 'low',
                date: dateStr,
                time: '09:30',
                endTime: '10:30',
                duration: 60,
                location: 'care_corner',
                description: 'Enjoy tea, coffee and snacks with friends!',
                maxParticipants: 40,
                currentParticipants: Math.floor(Math.random() * 25) + 10,
                instructor: null,
                emoji: '☕'
            });

            // Simple Exercises (Daily)
            activities.push({
                id: `simple-exercise-${dateStr}`,
                name: 'Simple Stretching',
                category: 'exercise',
                type: 'sit',
                intensity: 'low',
                date: dateStr,
                time: '11:00',
                endTime: '11:45',
                duration: 45,
                location: 'ntuc_aac',
                description: 'Gentle seated stretches for flexibility',
                maxParticipants: 25,
                currentParticipants: Math.floor(Math.random() * 15) + 5,
                instructor: 'Coach Mei',
                emoji: '🧘'
            });
            if (date.getDay() === 4) {
                activities.push({
                    id: `health-talk-${dateStr}`,
                    name: 'Health Talk',
                    category: 'education',
                    type: 'sit',
                    intensity: 'low',
                    date: dateStr,
                    time: '14:30',
                    endTime: '16:30',
                    duration: 120,
                    location: 'ntuc_aac',
                    description: 'Learn about managing common health conditions',
                    maxParticipants: 40,
                    currentParticipants: Math.floor(Math.random() * 25) + 10,
                    instructor: 'Dr. Wong',
                    emoji: '🩺'
                });
            }

            // Strength Training (Tue, Thu, Sat)
            if ([2, 4, 6].includes(date.getDay())) {
                activities.push({
                    id: `strength-${dateStr}`,
                    name: 'Gentle Strength Training',
                    category: 'exercise',
                    type: 'stand',
                    intensity: 'moderate',
                    date: dateStr,
                    time: '10:00',
                    endTime: '12:00',
                    duration: 120,
                    location: 'ntuc_daycare',
                    description: 'Build strength with resistance bands and light weights',
                    maxParticipants: 15,
                    currentParticipants: Math.floor(Math.random() * 10) + 3,
                    instructor: 'Coach Raju',
                    emoji: '💪'
                });
            }

            // Cooking Class (Fri)
            if (date.getDay() === 5) {
                activities.push({
                    id: `cooking-${dateStr}`,
                    name: 'Healthy Cooking Class',
                    category: 'cooking',
                    type: 'stand',
                    intensity: 'moderate',
                    date: dateStr,
                    time: '11:00',
                    endTime: '13:00',
                    duration: 120,
                    location: 'sunlove_marsiling',
                    description: 'Learn to cook nutritious meals for seniors',
                    maxParticipants: 12,
                    currentParticipants: Math.floor(Math.random() * 8) + 2,
                    instructor: 'Chef Mary',
                    emoji: '🍳'
                });
            }

            // Garden Walk (Wed, Sun)
            if ([3, 0].includes(date.getDay())) {
                activities.push({
                    id: `walk-${dateStr}`,
                    name: 'Garden Walk',
                    category: 'walking',
                    type: 'walk',
                    intensity: 'high',
                    date: dateStr,
                    time: '08:00',
                    endTime: '10:00',
                    duration: 120,
                    location: 'care_corner',
                    description: 'Morning walk around the garden with exercise stops',
                    maxParticipants: 15,
                    currentParticipants: Math.floor(Math.random() * 8) + 3,
                    instructor: 'Mr. Ahmad',
                    emoji: '🚶'
                });
            }

            // Line Dancing (Mon, Fri)
            if ([1, 5].includes(date.getDay())) {
                activities.push({
                    id: `dance-${dateStr}`,
                    name: 'Line Dancing',
                    category: 'dance',
                    type: 'walk',
                    intensity: 'high',
                    date: dateStr,
                    time: '16:00',
                    endTime: '18:00',
                    duration: 120,
                    location: 'sunlove_marsiling',
                    description: 'Fun dance moves in a group - no partner needed!',
                    maxParticipants: 25,
                    currentParticipants: Math.floor(Math.random() * 15) + 5,
                    instructor: 'Ms. Lim',
                    emoji: '💃'
                });
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        localStorage.setItem(this.KEYS.ACTIVITIES, JSON.stringify(activities));
        return activities;
    },

    getAllActivities() {
        const data = localStorage.getItem(this.KEYS.ACTIVITIES);
        return data ? JSON.parse(data) : this.seedActivities();
    },

    getActivityById(id) {
        const activities = this.getAllActivities();
        return activities.find(a => a.id === id);
    },

    // ============================================
    // REGISTRATIONS
    // ============================================
    getRegistrations() {
        const data = localStorage.getItem(this.KEYS.REGISTRATIONS);
        return data ? JSON.parse(data) : [];
    },

    registerForActivity(activityId) {
        const registrations = this.getRegistrations();
        const user = this.getCurrentUser();
        if (!user) return false;

        if (!registrations.some(r => r.activityId === activityId && r.userId === user.id)) {
            registrations.push({
                id: `reg_${Date.now()}`,
                userId: user.id,
                activityId: activityId,
                registeredAt: new Date().toISOString(),
                attended: false,
                attendanceConfirmed: false,
                pointsAwarded: false,
                feedbackCompleted: false,
                feedbackUnlocked: false
            });
            localStorage.setItem(this.KEYS.REGISTRATIONS, JSON.stringify(registrations));
            return true;
        }
        return false;
    },

    unregisterFromActivity(activityId) {
        let registrations = this.getRegistrations();
        const user = this.getCurrentUser();
        if (!user) return;
        registrations = registrations.filter(r => !(r.activityId === activityId && r.userId === user.id));
        localStorage.setItem(this.KEYS.REGISTRATIONS, JSON.stringify(registrations));
    },

    isRegistered(activityId) {
        const registrations = this.getRegistrations();
        const user = this.getCurrentUser();
        if (!user) return false;
        return registrations.some(r => r.activityId === activityId && r.userId === user.id);
    },

    getUserRegistrations() {
        const registrations = this.getRegistrations();
        const user = this.getCurrentUser();
        if (!user) return [];
        return registrations.filter(r => r.userId === user.id);
    },

    confirmAttendance(activityId) {
        const registrations = this.getRegistrations();
        const user = this.getCurrentUser();
        if (!user) return false;

        const reg = registrations.find(r => r.activityId === activityId && r.userId === user.id);
        if (reg && !reg.attendanceConfirmed) {
            reg.attended = true;
            reg.attendanceConfirmed = true;
            reg.attendanceTime = new Date().toISOString();

            if (!reg.pointsAwarded) {
                reg.pointsAwarded = true;
                this.addUserPoints(10, 'Attended activity');
            }

            // Unlock feedback immediately for demo
            reg.feedbackUnlocked = true;

            localStorage.setItem(this.KEYS.REGISTRATIONS, JSON.stringify(registrations));
            return true;
        }
        return false;
    },

    getPendingFeedback() {
        const registrations = this.getUserRegistrations();
        return registrations.filter(r => r.attendanceConfirmed && r.feedbackUnlocked && !r.feedbackCompleted);
    },

    // ============================================
    // FEEDBACK
    // ============================================
    getFeedback() {
        const data = localStorage.getItem(this.KEYS.FEEDBACK);
        return data ? JSON.parse(data) : [];
    },

    submitFeedback(activityId, feedback) {
        const allFeedback = this.getFeedback();
        const user = this.getCurrentUser();
        if (!user) return null;

        const newFeedback = {
            id: `fb_${Date.now()}`,
            userId: user.id,
            activityId,
            ...feedback,
            submittedAt: new Date().toISOString()
        };

        allFeedback.push(newFeedback);
        localStorage.setItem(this.KEYS.FEEDBACK, JSON.stringify(allFeedback));

        const registrations = this.getRegistrations();
        const reg = registrations.find(r => r.activityId === activityId && r.userId === user.id);
        if (reg) {
            reg.feedbackCompleted = true;
            localStorage.setItem(this.KEYS.REGISTRATIONS, JSON.stringify(registrations));
        }

        this.addUserPoints(20, 'Completed feedback survey');
        return newFeedback;
    },

    // ============================================
    // NOTIFICATIONS
    // ============================================
    getNotifications() {
        const data = localStorage.getItem(this.KEYS.NOTIFICATIONS);
        const notifications = data ? JSON.parse(data) : [];
        const user = this.getCurrentUser();
        if (!user) return [];
        return notifications.filter(n => n.userId === user.id);
    },

    addNotification(notification) {
        const notifications = JSON.parse(localStorage.getItem(this.KEYS.NOTIFICATIONS) || '[]');
        const user = this.getCurrentUser();
        if (!user) return;

        notifications.unshift({
            id: `notif_${Date.now()}`,
            userId: user.id,
            ...notification,
            createdAt: new Date().toISOString(),
            read: false
        });

        const userNotifs = notifications.filter(n => n.userId === user.id).slice(0, 20);
        const otherNotifs = notifications.filter(n => n.userId !== user.id);
        localStorage.setItem(this.KEYS.NOTIFICATIONS, JSON.stringify([...userNotifs, ...otherNotifs]));
    },

    markNotificationRead(notifId) {
        const notifications = JSON.parse(localStorage.getItem(this.KEYS.NOTIFICATIONS) || '[]');
        const notif = notifications.find(n => n.id === notifId);
        if (notif) {
            notif.read = true;
            localStorage.setItem(this.KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        }
    },

    getUnreadCount() {
        return this.getNotifications().filter(n => !n.read).length;
    },

    generateMatchingNotifications() {
        const user = this.getCurrentUser();
        if (!user || !user.interests || user.interests.length === 0) return;

        const activities = this.getAllActivities();
        const today = new Date().toISOString().split('T')[0];
        const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

        const matches = activities.filter(a =>
            a.date >= today && a.date <= threeDaysLater && user.interests.includes(a.category)
        );

        if (matches.length > 0) {
            const notifications = this.getNotifications();
            const hasRecent = notifications.some(n =>
                n.type === 'interest_match' &&
                (Date.now() - new Date(n.createdAt).getTime()) < 24 * 60 * 60 * 1000
            );

            if (!hasRecent) {
                const sample = matches.slice(0, 3);
                this.addNotification({
                    type: 'interest_match',
                    title: 'Activities For You! 🎯',
                    message: `${matches.length} activities matching your interests: ${sample.map(a => a.name).join(', ')}`,
                    icon: '⭐'
                });
            }
        }
    },

    // ============================================
    // TRANSPORT
    // ============================================
    requestTransport(pickupLocation, destination) {
        const user = this.getCurrentUser();
        if (!user || !user.hasMobilityIssue) {
            return { success: false, message: 'Transport for mobility users only' };
        }
        return { success: true, eta: '5 minutes', driver: 'Mr. Ahmad' };
    },

    // ============================================
    // MAP UTILITIES
    // ============================================
    getDistanceToLocation(userLat, userLng, locationId) {
        const loc = Object.values(this.LOCATIONS).find(l => l.id === locationId);
        if (!loc || !loc.lat || !loc.lng) return null;

        // Haversine formula
        const R = 6371;
        const dLat = (loc.lat - userLat) * Math.PI / 180;
        const dLng = (loc.lng - userLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(loc.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(2);
    },

    getGoogleMapsUrl(locationId) {
        const loc = Object.values(this.LOCATIONS).find(l => l.id === locationId);
        if (!loc) return '#';
        // Use address string for better accuracy if lat/lng is approximate
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}&query_place_id=`;
    },

    // ============================================
    // UTILITY
    // ============================================
    clearAllData() {
        Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
        console.log('🗑️ All data cleared');
    },

    fullReset() {
        if (confirm('Are you sure you want to reset ALL data? This will return the app to its original state.')) {
            localStorage.clear();
            window.location.reload();
        }
    },
    // ============================================
    // DEMO HELPER
    // ============================================
    ensureDemoFeedback(userId) {
        if (this.getPendingFeedback().length > 0) return;

        // Find a recent past activity (e.g. yesterday)
        const activities = this.getAllActivities();
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const target = activities.find(a => a.date === yesterday && a.name.includes('Game'));

        if (!target) return;

        // Register user if not already
        if (!this.isRegistered(target.id)) {
            this.registerForActivity(target.id);
        }

        // Force update registration to be attended and feedback ready
        const regs = this.getUserRegistrations();
        const regIndex = regs.findIndex(r => r.activityId === target.id);
        if (regIndex >= 0) {
            regs[regIndex].attendanceConfirmed = true;
            regs[regIndex].feedbackUnlocked = true;
            regs[regIndex].feedbackCompleted = false;
            localStorage.setItem(this.KEYS.REGISTRATIONS, JSON.stringify(regs));
            console.log('✅ Created demo pending feedback activity');
        }
    },

    // ============================================
    // RISK & RECOMENDATION LOGIC
    // ============================================
    calculateFallRisk(user) {
        if (!user) return 'low';

        let riskScore = 0;

        // 1. Mobility Issues (Highest Impact)
        if (user.hasMobilityIssue) riskScore += 3;

        // 2. Activity Level
        if (user.activityLevel === 'low') riskScore += 2;
        else if (user.activityLevel === 'moderate') riskScore += 1;

        // 3. Health History (Hospital Visits suggest frailty)
        if (user.hospitalVisits >= 2) riskScore += 2;
        else if (user.hospitalVisits === 1) riskScore += 1;

        // 4. Age (Simulated based on bio or assume >60)
        // In a real app we would use DOB. Here we assume all are seniors.

        if (riskScore >= 4) return 'high';
        if (riskScore >= 2) return 'moderate';
        return 'low';
    },

    getRecommendedActivities(userId) {
        const user = this.getUserById(userId);
        if (!user) return [];

        const allActivities = this.getAllActivities();
        const fallRisk = this.calculateFallRisk(user);

        // Filter based on safety first
        let safetyFiltered = allActivities;
        if (fallRisk === 'high') {
            // High risk: Only allow Sit activities or specific supported ones
            safetyFiltered = allActivities.filter(a => a.type === 'sit' || a.category === 'health-talk');
        } else if (fallRisk === 'moderate') {
            // Moderate risk: Sit and Stand are okay, avoid high intensity walks if unassisted
            safetyFiltered = allActivities.filter(a => a.type !== 'walk');
        }

        // Scored sorting based on interests
        return safetyFiltered.filter(a => {
            const isInterest = user.interests.includes(a.category);
            return isInterest; // Basic recommendation: matches interest AND is safe
        });
    }
};

// Initialize
Database.init();
window.Database = Database;

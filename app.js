/* ==========================================================================
   LuminaChat Application Logic
   ========================================================================== */

(function () {
    'use strict';

    // --- State Management ---
    let chats = [];
    let activeChatId = null;
    const DEFAULT_API_KEY = 'AQ.Ab8RN6IicdVMxWUZrCGGwUg_mTM2FjmSc6EeZSmuNB6AVw3y0g';
    let settings = {
        apiKey: DEFAULT_API_KEY,
        theme: 'dark',
        persona: 'companion'
    };

    // Auth & Users State
    let currentUser = null;

    // --- DOM Elements ---
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const chatList = document.getElementById('chatList');
    const chatTitleInput = document.getElementById('chatTitleInput');
    const activeModelBadge = document.getElementById('activeModelBadge');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const messagesContainer = document.getElementById('messagesContainer');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const messagesList = document.getElementById('messagesList');
    const scrollBottomBtn = document.getElementById('scrollBottomBtn');
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const toast = document.getElementById('toast');

    // Settings Modal DOM Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const darkThemeBtn = document.getElementById('darkThemeBtn');
    const lightThemeBtn = document.getElementById('lightThemeBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const toggleApiVisibilityBtn = document.getElementById('toggleApiVisibilityBtn');
    const eyeIcon = document.getElementById('eyeIcon');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const personaSelect = document.getElementById('personaSelect');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const importFileInput = document.getElementById('importFileInput');
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');

    // Auth DOM Elements
    const authOverlay = document.getElementById('authOverlay');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const signupTabBtn = document.getElementById('signupTabBtn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const toggleLoginPwBtn = document.getElementById('toggleLoginPwBtn');
    const loginError = document.getElementById('loginError');

    const signupUsernameInput = document.getElementById('signupUsername');
    const signupNicknameInput = document.getElementById('signupNickname');
    const signupPasswordInput = document.getElementById('signupPassword');
    const signupPasswordConfirmInput = document.getElementById('signupPasswordConfirm');
    const toggleSignupPwBtn = document.getElementById('toggleSignupPwBtn');
    const signupError = document.getElementById('signupError');

    const toSignupLink = document.getElementById('toSignupLink');
    const toLoginLink = document.getElementById('toLoginLink');

    // Sidebar User Profile DOM Elements
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userStatus = document.getElementById('userStatus');
    const logoutBtn = document.getElementById('logoutBtn');

    // --- Life Cycle & Initialization ---
    function init() {
        setupEventListeners();
        
        const isLoggedIn = loadCurrentUser();
        if (isLoggedIn) {
            authOverlay.classList.add('hidden');
            updateUserProfileUI();
            loadSettings();
            loadChats();
            applyTheme();
            updateApiKeyStatusUI();

            // Load active or most recent chat
            if (chats.length > 0) {
                // Find most recently updated chat or default to the first one
                const sorted = [...chats].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                selectChat(sorted[0].id);
            } else {
                showWelcomeScreen();
            }
        } else {
            authOverlay.classList.remove('hidden');
        }
    }

    // --- Auth & User Management Helpers ---
    function loadCurrentUser() {
        const stored = localStorage.getItem('lumina_current_user');
        if (stored) {
            try {
                currentUser = JSON.parse(stored);
                return true;
            } catch (e) {
                console.error('사용자 세션 로드 실패:', e);
                currentUser = null;
            }
        }
        return false;
    }

    function saveCurrentUser(user) {
        currentUser = user;
        localStorage.setItem('lumina_current_user', JSON.stringify(user));
        updateUserProfileUI();
    }

    function updateUserProfileUI() {
        if (currentUser) {
            userName.textContent = currentUser.nickname || currentUser.username;
            userStatus.textContent = '일반 사용자';
            
            // Avatar mapping
            const avatarChar = (currentUser.nickname || currentUser.username).charAt(0).toUpperCase();
            userAvatar.textContent = avatarChar;
            
            // Set dynamic theme class
            userAvatar.className = `avatar-user avatar-theme-${currentUser.avatarTheme || 'purple'}`;
        } else {
            userName.textContent = '게스트 사용자';
            userStatus.textContent = '로그인 없음 (로컬)';
            userAvatar.textContent = 'G';
            userAvatar.className = 'avatar-user';
        }
    }

    function loadUsers() {
        const stored = localStorage.getItem('lumina_users');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('회원 목록 로드 실패:', e);
                return [];
            }
        }
        return [];
    }

    function saveUsers(users) {
        localStorage.setItem('lumina_users', JSON.stringify(users));
    }

    // --- Storage Helpers ---
    function loadSettings() {
        if (!currentUser) return;
        const stored = localStorage.getItem(`lumina_settings_${currentUser.username}`);
        if (stored) {
            try {
                settings = { ...settings, ...JSON.parse(stored) };
            } catch (e) {
                console.error('설정 로드 실패:', e);
            }
        } else {
            // Default settings for new user
            settings = {
                apiKey: DEFAULT_API_KEY,
                theme: 'dark',
                persona: 'companion'
            };
            saveSettings();
        }
        
        // If loaded key is empty, populate with default key
        if (!settings.apiKey) {
            settings.apiKey = DEFAULT_API_KEY;
            localStorage.setItem(`lumina_settings_${currentUser.username}`, JSON.stringify(settings));
        }
    }

    function saveSettings() {
        if (!currentUser) return;
        localStorage.setItem(`lumina_settings_${currentUser.username}`, JSON.stringify(settings));
        applyTheme();
        updateApiKeyStatusUI();
    }

    function loadChats() {
        if (!currentUser) return;
        const stored = localStorage.getItem(`lumina_chats_${currentUser.username}`);
        if (stored) {
            try {
                chats = JSON.parse(stored);
            } catch (e) {
                console.error('채팅 로드 실패:', e);
                chats = [];
            }
        } else {
            chats = [];
        }
    }

    function saveChats() {
        if (!currentUser) return;
        localStorage.setItem(`lumina_chats_${currentUser.username}`, JSON.stringify(chats));
        renderChatList();
    }

    function applyTheme() {
        if (settings.theme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            darkThemeBtn.classList.remove('active');
            lightThemeBtn.classList.add('active');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            lightThemeBtn.classList.remove('active');
            darkThemeBtn.classList.add('active');
        }
    }

    // --- UI Rendering ---
    function renderChatList() {
        chatList.innerHTML = '';
        if (chats.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'chat-list-title';
            emptyEl.style.textAlign = 'center';
            emptyEl.style.padding = '10px 0';
            emptyEl.style.textTransform = 'none';
            emptyEl.textContent = '저장된 대화가 없습니다';
            chatList.appendChild(emptyEl);
            return;
        }

        // Sort by timestamp desc
        const sortedChats = [...chats].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        sortedChats.forEach(chat => {
            const li = document.createElement('li');
            li.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
            li.setAttribute('data-id', chat.id);

            const titleWrapper = document.createElement('div');
            titleWrapper.className = 'chat-item-title-wrapper';

            // SVG chat bubble icon
            titleWrapper.innerHTML = `
                <svg class="chat-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="chat-item-title">${escapeHTML(chat.title)}</span>
            `;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'chat-item-delete';
            deleteBtn.title = '대화 삭제';
            deleteBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;

            li.appendChild(titleWrapper);
            li.appendChild(deleteBtn);

            // Click to switch chat
            li.addEventListener('click', (e) => {
                if (e.target.closest('.chat-item-delete')) {
                    e.stopPropagation();
                    deleteChat(chat.id);
                } else {
                    selectChat(chat.id);
                    if (window.innerWidth <= 768) {
                        sidebar.classList.remove('open');
                    }
                }
            });

            chatList.appendChild(li);
        });
    }

    function renderMessages() {
        messagesList.innerHTML = '';
        const activeChat = chats.find(c => c.id === activeChatId);
        
        if (!activeChat || activeChat.messages.length === 0) {
            showWelcomeScreen();
            return;
        }

        hideWelcomeScreen();

        activeChat.messages.forEach(msg => {
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ${msg.sender}`;

            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            
            if (msg.sender === 'user') {
                avatar.textContent = 'U';
            } else {
                avatar.textContent = 'AI';
            }

            const box = document.createElement('div');
            box.className = 'message-box';

            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            bubble.innerHTML = parseMarkdown(msg.text);

            const meta = document.createElement('div');
            meta.className = 'message-meta';
            meta.textContent = formatTime(msg.timestamp);

            box.appendChild(bubble);
            box.appendChild(meta);
            wrapper.appendChild(avatar);
            wrapper.appendChild(box);

            messagesList.appendChild(wrapper);
        });

        scrollToBottom();
    }

    function showWelcomeScreen() {
        welcomeScreen.style.display = 'flex';
        messagesList.style.display = 'none';
        chatTitleInput.value = '새로운 대화';
        activeModelBadge.textContent = settings.apiKey ? 'Gemini 2.5 Flash' : '시뮬레이션 모드';
    }

    function hideWelcomeScreen() {
        welcomeScreen.style.display = 'none';
        messagesList.style.display = 'flex';
    }

    // --- Chat Operations ---
    function createNewChat(initialMessage = null) {
        const newId = generateUUID();
        const newChat = {
            id: newId,
            title: initialMessage ? truncateString(initialMessage, 15) : '새로운 대화',
            messages: [],
            persona: settings.persona,
            timestamp: new Date().toISOString()
        };

        chats.push(newChat);
        activeChatId = newId;

        saveChats();
        selectChat(newId);

        if (initialMessage) {
            handleSendMessage(initialMessage);
        }
    }

    function selectChat(id) {
        activeChatId = id;
        const chat = chats.find(c => c.id === id);
        if (chat) {
            chatTitleInput.value = chat.title;
            // Update active model badge depending on settings and api key
            activeModelBadge.textContent = settings.apiKey ? 'Gemini 2.5 Flash' : '시뮬레이션 모드';
            renderChatList();
            renderMessages();
            messageInput.focus();
        }
    }

    function deleteChat(id) {
        if (confirm('이 대화 기록을 정말 삭제하시겠습니까?')) {
            const index = chats.findIndex(c => c.id === id);
            if (index !== -1) {
                chats.splice(index, 1);
                saveChats();
                
                if (activeChatId === id) {
                    if (chats.length > 0) {
                        selectChat(chats[0].id);
                    } else {
                        activeChatId = null;
                        showWelcomeScreen();
                        renderChatList();
                    }
                }
            }
        }
    }

    function renameActiveChat(newTitle) {
        if (!newTitle.trim()) return;
        const chat = chats.find(c => c.id === activeChatId);
        if (chat) {
            chat.title = newTitle.trim();
            saveChats();
        }
    }

    // --- Messaging ---
    async function handleSendMessage(text) {
        if (!text.trim()) return;

        // If no active chat, create one automatically
        if (!activeChatId) {
            createNewChat(text);
            return;
        }

        const chat = chats.find(c => c.id === activeChatId);
        if (!chat) return;

        // Disable input elements during transmission to prevent spamming
        messageInput.disabled = true;
        sendBtn.disabled = true;

        // Add user message
        const userMsg = {
            sender: 'user',
            text: text,
            timestamp: new Date().toISOString()
        };
        chat.messages.push(userMsg);
        chat.timestamp = new Date().toISOString();

        // If it was default title, rename to first message snippet
        if (chat.title === '새로운 대화') {
            chat.title = truncateString(text, 15);
            chatTitleInput.value = chat.title;
        }

        saveChats();
        renderMessages();

        // Clear input and reset heights
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Show typing indicator
        showTypingIndicator();

        try {
            let aiResponseText = '';
            
            if (settings.apiKey) {
                // Call real Gemini API
                aiResponseText = await callGeminiAPI(settings.apiKey, chat.messages, chat.persona || settings.persona);
            } else {
                // Offline Simulator
                aiResponseText = await getSimulatedResponse(text, chat.persona || settings.persona);
            }

            // Remove typing indicator
            removeTypingIndicator();

            // Add AI response
            const aiMsg = {
                sender: 'ai',
                text: aiResponseText,
                timestamp: new Date().toISOString()
            };
            chat.messages.push(aiMsg);
            chat.timestamp = new Date().toISOString();
            
            saveChats();
            renderMessages();

        } catch (error) {
            console.error('AI 응답 생성 실패:', error);
            removeTypingIndicator();
            
            // Render error message
            const errorMsg = {
                sender: 'ai',
                text: `⚠️ **응답을 받지 못했습니다.**\n\n오류: ${error.message}\n\n설정 창에서 Gemini API 키를 다시 확인해주시거나, 키를 삭제하고 오프라인 시뮬레이션 모드로 다시 시도해 주세요.`,
                timestamp: new Date().toISOString()
            };
            chat.messages.push(errorMsg);
            saveChats();
            renderMessages();
        } finally {
            // Re-enable and refocus inputs
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.focus();
        }
    }

    function showTypingIndicator() {
        removeTypingIndicator(); // safety cleanup

        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper ai typing-indicator-wrapper';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'AI';

        const box = document.createElement('div');
        box.className = 'message-box';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;

        bubble.appendChild(indicator);
        box.appendChild(bubble);
        wrapper.appendChild(avatar);
        wrapper.appendChild(box);

        messagesList.appendChild(wrapper);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicators = messagesList.querySelectorAll('.typing-indicator-wrapper');
        indicators.forEach(el => el.remove());
    }

    // --- Simulated AI Engine ---
    function getSimulatedResponse(userText, persona) {
        return new Promise((resolve) => {
            // Emulate network latency
            const delay = 1000 + Math.random() * 1200;
            
            setTimeout(() => {
                const query = userText.toLowerCase().trim();
                let reply = '';

                if (persona === 'coder') {
                    if (query.includes('코드') || query.includes('자바스크립트') || query.includes('javascript') || query.includes('js')) {
                        reply = `안녕하세요! 개발 멘토입니다. 자바스크립트 기본 코드를 공유해 드릴게요.

아래 코드는 웹 브라우저 콘솔에서 즉시 실행이 가능한 **카운터 클래스** 구조입니다.

\`\`\`javascript
class Counter {
  constructor(start = 0) {
    this.value = start;
  }
  
  increment() {
    this.value++;
    console.log("현재 값:", this.value);
    return this.value;
  }
  
  decrement() {
    this.value--;
    console.log("현재 값:", this.value);
    return this.value;
  }
}

// 클래스 인스턴스 생성 및 호출 테스트
const myCounter = new Counter(10);
myCounter.increment(); // 11
myCounter.increment(); // 12
myCounter.decrement(); // 11
\`\`\`

### 💡 설명
* **Class Syntax**: 객체 지향 프로그래밍 방식으로 코드를 확장 가능하게 만듭니다.
* **Encapsulation**: 카운터의 핵심 비즈니스 로직(값 증가/감소)을 메서드 안에 캡슐화했습니다.

추가적인 프레임워크나 특정 언어의 심화 지식에 대해 물어보시면 더욱 상세히 도와드릴 수 있습니다!`;
                    } else if (query.includes('안녕') || query.includes('반갑')) {
                        reply = `반갑습니다! 꼼꼼한 개발 멘토입니다. 💻
오늘 개발하면서 겪고 있는 문제나 공부하고 싶은 기술 스택이 있으신가요? 

**예시 질문:**
* "HTML과 CSS로 웹 구조 잡는 법 알려줘"
* "자바스크립트 비동기 fetch API 사용법 예제 코드"
* "CSS Glassmorphism 테마 어떻게 적용해?"

편하게 질문해 주세요!`;
                    } else {
                        reply = `사용자님의 질문(\`"${truncateString(userText, 30)}"\`)에 대해 개발 관점에서 분석한 내용입니다.

현재 시뮬레이션 모드이므로 상세한 맞춤형 프로그래밍 해결책은 어려울 수 있지만, 일반적인 소프트웨어 설계 원칙을 알려드릴게요.

1. **문제를 더 작은 단위로 쪼개기**: 큰 복잡성은 작은 결합도 낮은 함수나 컴포넌트로 나눌 때 해결됩니다.
2. **에러 핸들링 생활화**: `try-catch` 블록이나 유효성 검사를 통해 프로그램 안정성을 늘 확보해 두세요.
3. **직관적인 네이밍**: 변수나 함수의 역할이 이름만으로 한눈에 파악되게 지어주면 유지보수가 아주 쉬워집니다.

실제 실시간 지식 답변을 원하신다면 **설정 창(좌측 하단 톱니바퀴)에서 Gemini API 키를 등록**하시면 더 똑똑한 조언을 받아보실 수 있습니다.`;
                    }
                } 
                else if (persona === 'writer') {
                    if (query.includes('안녕') || query.includes('반갑')) {
                        reply = `안녕하세요. 글을 향한 첫걸음을 뗀 당신을 진심으로 환영합니다. ✍️
저는 생각을 문장으로 엮어내는 창의적인 카피라이터/작가입니다.

어떤 테마나 아이디어를 가지고 글을 다듬고 싶으신가요?
시, 에세이, 블로그 게시글, 혹은 광고 카피라이팅까지 기꺼이 돕겠습니다.`;
                    } else if (query.includes('팁') || query.includes('생산') || query.includes('하루')) {
                        reply = `### 찬란한 하루를 짓는 작가의 작은 제안

매일 아침, 우리는 백지와 같은 시간을 선물 받습니다. 당신의 하루라는 도화지에 적어 내려갈 **3가지 감성적인 생산성 팁**을 전합니다.

1. **여백의 의식 (The Ritual of Blank Space)**
   * 아침의 첫 10분은 스마트폰 화면 대신, 아무것도 쓰이지 않은 창 밖 풍경을 마주해 보세요. 채우기 전에 비워내는 과정이 집중력을 높입니다.
2. **단어의 심상화 (Word Visualization)**
   * 오늘 하루의 테마 단어를 하나 골라보세요 (예: *'차분함'*, *'속도'*, *'다정함'*). 그리고 행동을 취할 때마다 이 단어를 기준점 삼아 움직여 봅니다.
3. **마무리 마침표 찍기 (The End Statement)**
   * 할 일 목록을 지우는 데만 급급해하지 말고, 하루를 정리하며 '오늘 내가 가장 행복했던 한 줄'을 기록으로 마쳐보세요.

당신의 오늘이라는 장르가 해피엔딩이길 바랍니다.`;
                    } else {
                        reply = `적어주신 단어 **"${escapeHTML(userText)}"**에서 영감을 받아 조율한 짧은 미완의 문장입니다.

> "누군가 남긴 희미한 흔적이 거대한 물결이 되기까지, 우리는 아주 작은 첫 글자를 써야만 한다."

이 문장을 토대로 이야기를 더 이어 나가볼까요? 구체적인 설정이나 등장인물, 혹은 담고 싶은 감정에 대해 알려주시면 한 층 더 풍부한 글로 완성해 드리겠습니다.`;
                    }
                }
                else { // companion
                    if (query.includes('안녕') || query.includes('반갑')) {
                        reply = `안녕하세요! 오늘 하루는 기분 좋게 시작하셨나요? 😊
저는 당신의 다정하고 친절한 대화 메이트 루미나입니다. 

오늘 나누고 싶은 소소한 이야기나 속상했던 일, 자랑하고 싶은 것이 있다면 무엇이든 편하게 이야기해 주세요. 언제나 마음 다해 들어드릴게요! ✨`;
                    } else if (query.includes('팁') || query.includes('생산') || query.includes('하루')) {
                        reply = `오늘 하루를 힘차고 기분 좋게 보내고 싶으시군요! 
제가 제안하는 **하루 충전 3가지 루틴**을 소개해 드릴게요! 🍀

* **따뜻한 물 한 잔으로 시작하기**: 잠들어 있던 우리 몸의 순환을 부드럽게 깨워준답니다. 💧
* **가벼운 스트레칭**: 어깨와 목의 긴장을 풀어주는 것만으로도 머리가 맑아지고 긍정적인 마음이 솟아나요! 🧘‍♀️
* **나를 위한 셀프 칭찬**: 거창하지 않아도 괜찮아요. "오늘도 힘차게 일어난 나, 멋지다!" 하고 마음속으로 속삭여주세요.

오늘 하루도 반짝반짝 빛나길 응원할게요. 화이팅! 🥰`;
                    } else if (query.includes('심심')) {
                        reply = `심심하시군요! 저랑 같이 재미있는 상상 놀이를 해볼까요? 🎈
혹시 만약 시간 여행을 할 수 있다면, 과거와 미래 중 어디로 가보고 싶으세요? 

아니면 오늘 먹은 메뉴나 요즘 즐겨 듣는 노래 추천을 나누는 것도 좋아요! 어떤 얘기든 들려주세요. 🎧`;
                    } else {
                        reply = `**"${escapeHTML(userText)}"**에 대해 이야기해 주셨군요! 
말씀해주신 이야기를 들으니 저도 기분이 참 묘해지고 집중하게 돼요. 

생각이나 감정을 글로 꺼내어 나누다 보면 한결 마음이 가벼워지고 편안해지더라고요. 혹시 그것과 관련해서 더 들려주고 싶은 상세한 기억이나 감정이 있다면 더 얘기해 주실 수 있나요? 

제가 언제나 옆에서 들어드릴게요! 🧡`;
                    }
                }

                resolve(reply);
            }, delay);
        });
    }

    // --- Gemini API Client ---
    async function callGeminiAPI(apiKey, messages, persona) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        let systemPrompt = '';
        if (persona === 'writer') {
            systemPrompt = '당신은 창의적이고 감각적인 글쓰기 전문가입니다. 문맥이 매끄럽고 트렌디하며 참신한 표현을 씁니다. 사용자에게 도움을 주기 위해 아이디어를 브레인스토밍하고 글을 교정하거나 창작해주세요.';
        } else if (persona === 'coder') {
            systemPrompt = '당신은 친절하고 디테일한 시니어 소프트웨어 엔지니어이자 코딩 멘토입니다. 코드 예제를 제공할 때는 항상 깔끔하게 마크다운 코드 블록(```언어)을 사용하고, 설명은 주석과 요약 리스트를 이용해 논리정연하게 기술해주세요.';
        } else {
            systemPrompt = '당신은 사용자에게 힘이 되어주는 다정하고 지혜로운 친구 "루미나"입니다. 따뜻하고 경청하는 태도로 친근하고 부드러운 한국어 존댓말을 사용해 답하며, 이모티콘을 넉넉히 활용해 편안한 대화를 유도해주세요.';
        }

        // Keep last 15 messages to prevent token limits on free api
        const recentMessages = messages.slice(-15);
        
        const geminiContents = recentMessages.map(msg => {
            return {
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            };
        });

        const requestBody = {
            contents: geminiContents,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            const errMsg = errJson.error?.message || `HTTP ${response.status} Error`;
            throw new Error(errMsg);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('API가 비어있는 응답을 반환했습니다.');
        }
    }

    // Direct Check for Api Key
    async function testApiKeyValidity(key) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
        const requestBody = {
            contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
            generationConfig: { maxOutputTokens: 5 }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('API Key is invalid');
        }
        return true;
    }

    function updateApiKeyStatusUI() {
        if (!settings.apiKey) {
            apiKeyStatus.innerHTML = '<span class="status-indicator"></span> <span class="status-text">시뮬레이션 모드 사용 중 (API 없음)</span>';
            apiKeyStatus.querySelector('.status-indicator').className = 'status-indicator';
        } else {
            apiKeyStatus.innerHTML = '<span class="status-indicator warning"></span> <span class="status-text">Gemini API 연동 중 (연결 검사 대기)</span>';
            
            // Check asynchronously to prevent UI freeze
            testApiKeyValidity(settings.apiKey)
                .then(() => {
                    const indicator = apiKeyStatus.querySelector('.status-indicator');
                    const text = apiKeyStatus.querySelector('.status-text');
                    if (indicator && text) {
                        indicator.className = 'status-indicator success';
                        text.textContent = 'Gemini API 연결에 성공했습니다.';
                    }
                })
                .catch(() => {
                    const indicator = apiKeyStatus.querySelector('.status-indicator');
                    const text = apiKeyStatus.querySelector('.status-text');
                    if (indicator && text) {
                        indicator.className = 'status-indicator warning';
                        text.textContent = '잘못된 API 키이거나 통신 장애가 있습니다.';
                    }
                });
        }
    }

    // --- Markdown Parser Utility ---
    function parseMarkdown(text) {
        if (!text) return '';

        // 1. Escape HTML first to prevent XSS
        let escaped = escapeHTML(text);

        // 2. Extract code blocks (```lang\ncode\n```) to preserve them from other parse rules
        const codeBlocks = [];
        escaped = escaped.replace(/```(\w*)\n([\s\S]*?)\n?```/g, (match, lang, code) => {
            const id = codeBlocks.length;
            codeBlocks.push({
                lang: lang || 'code',
                code: code
            });
            return `__CODE_BLOCK_PLACEHOLDER_${id}__`;
        });

        // 3. Match bold formatting (**text**)
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 4. Match inline code (`code`)
        escaped = escaped.replace(/`(.*?)`/g, '<code>$1</code>');

        // 5. Line by line parsing for headers, list elements, and line breaks
        const lines = escaped.split('\n');
        let parsedHtml = '';
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Heading match (### Heading)
            const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
            if (headingMatch) {
                if (inList) {
                    parsedHtml += '</ul>';
                    inList = false;
                }
                const level = headingMatch[1].length;
                parsedHtml += `<h${level}>${headingMatch[2]}</h${level}>`;
                continue;
            }

            // Bullet list match (* item or - item or + item)
            const listMatch = line.match(/^[\s]*[-*+][\s]+(.*)/);
            if (listMatch) {
                if (!inList) {
                    parsedHtml += '<ul>';
                    inList = true;
                }
                parsedHtml += `<li>${listMatch[1]}</li>`;
            } else {
                if (inList) {
                    parsedHtml += '</ul>';
                    inList = false;
                }
                if (line.trim() === '') {
                    parsedHtml += '<div class="spacer" style="height: 8px;"></div>';
                } else {
                    parsedHtml += `<p>${line}</p>`;
                }
            }
        }

        if (inList) {
            parsedHtml += '</ul>';
        }

        // 6. Replace code block placeholders back with custom syntax-highlight containers
        parsedHtml = parsedHtml.replace(/__CODE_BLOCK_PLACEHOLDER_(\d+)__/g, (match, id) => {
            const block = codeBlocks[id];
            return `
                <div class="code-block-container">
                    <div class="code-block-header">
                        <span>${escapeHTML(block.lang.toUpperCase())}</span>
                        <button class="code-copy-btn" onclick="window.copyCodeBlock(this)" type="button">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>복사</span>
                        </button>
                    </div>
                    <pre><code>${block.code}</code></pre>
                </div>
            `;
        });

        return parsedHtml;
    }

    // --- Helper Functions ---
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function truncateString(str, num) {
        if (str.length <= num) return str;
        return str.slice(0, num) + '...';
    }

    function formatTime(isoString) {
        const d = new Date(isoString);
        let hr = d.getHours();
        const min = String(d.getMinutes()).padStart(2, '0');
        const ampm = hr >= 12 ? '오후' : '오전';
        hr = hr % 12;
        hr = hr ? hr : 12; // 0 should be 12
        return `${ampm} ${hr}:${min}`;
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // --- Global Code Copy function ---
    window.copyCodeBlock = function (btn) {
        const container = btn.closest('.code-block-container');
        if (!container) return;
        const codeElement = container.querySelector('pre code');
        if (!codeElement) return;

        // Create virtual textarea for copy
        // Unescape the HTML inside code block for standard copy
        const text = codeElement.textContent;
        navigator.clipboard.writeText(text)
            .then(() => {
                const label = btn.querySelector('span');
                label.textContent = '복사 완료!';
                btn.style.color = '#48bb78';
                setTimeout(() => {
                    label.textContent = '복사';
                    btn.style.color = '';
                }, 1500);
                showToast('클립보드에 소스코드가 복사되었습니다.');
            })
            .catch(err => {
                console.error('클립보드 복사 에러:', err);
                showToast('복사 실패했습니다.');
            });
    };

    // --- Event Listeners ---
    function setupEventListeners() {
        // Auth Tab Switching
        loginTabBtn.addEventListener('click', () => {
            loginTabBtn.classList.add('active');
            signupTabBtn.classList.remove('active');
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
            loginError.textContent = '';
            signupError.textContent = '';
        });

        signupTabBtn.addEventListener('click', () => {
            signupTabBtn.classList.add('active');
            loginTabBtn.classList.remove('active');
            signupForm.classList.add('active');
            loginForm.classList.remove('active');
            loginError.textContent = '';
            signupError.textContent = '';
        });

        toSignupLink.addEventListener('click', () => {
            signupTabBtn.click();
        });

        toLoginLink.addEventListener('click', () => {
            loginTabBtn.click();
        });

        // Toggle Password Visibility
        toggleLoginPwBtn.addEventListener('click', () => {
            const isPassword = loginPasswordInput.type === 'password';
            loginPasswordInput.type = isPassword ? 'text' : 'password';
            toggleLoginPwBtn.querySelector('svg').style.color = isPassword ? '#00ffff' : '';
        });

        toggleSignupPwBtn.addEventListener('click', () => {
            const isPassword = signupPasswordInput.type === 'password';
            signupPasswordInput.type = isPassword ? 'text' : 'password';
            toggleSignupPwBtn.querySelector('svg').style.color = isPassword ? '#00ffff' : '';
        });

        // Login Handler
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = loginUsernameInput.value.trim().toLowerCase();
            const password = loginPasswordInput.value;

            if (!username || !password) {
                loginError.textContent = '아이디와 비밀번호를 모두 입력해 주세요.';
                return;
            }

            const users = loadUsers();
            const user = users.find(u => u.username === username);

            if (!user || user.password !== password) {
                loginError.textContent = '아이디 또는 비밀번호가 일치하지 않습니다.';
                return;
            }

            saveCurrentUser(user);
            authOverlay.classList.add('hidden');
            
            loadSettings();
            loadChats();
            applyTheme();
            updateApiKeyStatusUI();

            if (chats.length > 0) {
                const sorted = [...chats].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                selectChat(sorted[0].id);
            } else {
                showWelcomeScreen();
                renderChatList();
            }

            showToast(`${user.nickname}님, 환영합니다!`);
            loginUsernameInput.value = '';
            loginPasswordInput.value = '';
            loginError.textContent = '';
        });

        // Signup Handler
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = signupUsernameInput.value.trim().toLowerCase();
            const nickname = signupNicknameInput.value.trim();
            const password = signupPasswordInput.value;
            const passwordConfirm = signupPasswordConfirmInput.value;
            const selectedAvatarTheme = signupForm.querySelector('input[name="avatarTheme"]:checked').value;

            if (username.length < 4 || !/^[a-z0-9]+$/.test(username)) {
                signupError.textContent = '아이디는 영문 소문자와 숫자 조합 4자 이상이어야 합니다.';
                return;
            }
            if (!nickname) {
                signupError.textContent = '닉네임을 입력해 주세요.';
                return;
            }
            if (password.length < 6) {
                signupError.textContent = '비밀번호는 6자 이상이어야 합니다.';
                return;
            }
            if (password !== passwordConfirm) {
                signupError.textContent = '비밀번호가 일치하지 않습니다.';
                return;
            }

            const users = loadUsers();
            if (users.some(u => u.username === username)) {
                signupError.textContent = '이미 사용 중인 아이디입니다.';
                return;
            }

            const newUser = {
                username,
                nickname,
                password,
                avatarTheme: selectedAvatarTheme,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            saveUsers(users);

            saveCurrentUser(newUser);
            authOverlay.classList.add('hidden');

            loadSettings();
            loadChats();
            applyTheme();
            updateApiKeyStatusUI();

            showWelcomeScreen();
            renderChatList();

            showToast('회원가입 및 로그인이 완료되었습니다!');

            signupUsernameInput.value = '';
            signupNicknameInput.value = '';
            signupPasswordInput.value = '';
            signupPasswordConfirmInput.value = '';
            signupError.textContent = '';
        });

        // Logout Handler
        logoutBtn.addEventListener('click', () => {
            if (confirm('로그아웃 하시겠습니까?')) {
                localStorage.removeItem('lumina_current_user');
                currentUser = null;
                showToast('로그아웃 되었습니다.');
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        });

        // Mobile Sidebar Toggle
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });

        mobileCloseBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });

        // Close sidebar if click happens outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target) && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            }
        });

        // New Chat Button
        newChatBtn.addEventListener('click', () => {
            createNewChat();
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });

        // Title renaming
        chatTitleInput.addEventListener('change', () => {
            renameActiveChat(chatTitleInput.value);
        });

        chatTitleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                chatTitleInput.blur();
            }
        });

        // Clear Current Chat history
        clearChatBtn.addEventListener('click', () => {
            if (!activeChatId) return;
            if (confirm('현재 대화창의 메세지들을 모두 지우시겠습니까?')) {
                const chat = chats.find(c => c.id === activeChatId);
                if (chat) {
                    chat.messages = [];
                    saveChats();
                    renderMessages();
                }
            }
        });

        // Scroll Bottom button toggle visibility
        messagesContainer.addEventListener('scroll', () => {
            const currentScroll = messagesContainer.scrollTop;
            const maxScroll = messagesContainer.scrollHeight - messagesContainer.clientHeight;
            // Show button if scrolled up more than 150px
            if (maxScroll - currentScroll > 150) {
                scrollBottomBtn.classList.add('visible');
            } else {
                scrollBottomBtn.classList.remove('visible');
            }
        });

        // Scroll Bottom button click
        scrollBottomBtn.addEventListener('click', () => {
            scrollToBottom();
        });

        // Textarea handling
        messageInput.addEventListener('input', () => {
            // Auto resize height
            messageInput.style.height = 'auto';
            messageInput.style.height = messageInput.scrollHeight + 'px';
        });

        // Textarea Enter behavior
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Prevent duplicate submit on Korean IME commit
                if (e.isComposing || e.keyCode === 229) {
                    return;
                }
                e.preventDefault();
                const text = messageInput.value;
                if (text.trim()) {
                    handleSendMessage(text);
                }
            }
        });

        // Suggestions on Welcome page click
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.getAttribute('data-prompt');
                if (prompt) {
                    handleSendMessage(prompt);
                }
            });
        });

        // Form Submit
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = messageInput.value;
            if (text.trim()) {
                handleSendMessage(text);
            }
        });

        // --- Settings Modal Events ---
        settingsBtn.addEventListener('click', () => {
            // Populate settings modal with current values
            apiKeyInput.value = settings.apiKey;
            personaSelect.value = settings.persona;
            if (settings.theme === 'light') {
                lightThemeBtn.classList.add('active');
                darkThemeBtn.classList.remove('active');
            } else {
                darkThemeBtn.classList.add('active');
                lightThemeBtn.classList.remove('active');
            }
            updateApiKeyStatusUI();
            settingsModal.classList.add('open');
        });

        const closeModal = () => {
            settingsModal.classList.remove('open');
        };

        closeSettingsBtn.addEventListener('click', closeModal);
        
        // Save settings modal
        saveSettingsBtn.addEventListener('click', () => {
            settings.apiKey = apiKeyInput.value.trim();
            settings.persona = personaSelect.value;
            saveSettings();
            closeModal();
            
            // Refresh active model badge
            if (activeChatId) {
                const chat = chats.find(c => c.id === activeChatId);
                if (chat) {
                    // Update persona inside active chat
                    chat.persona = settings.persona;
                    saveChats();
                }
                activeModelBadge.textContent = settings.apiKey ? 'Gemini 2.5 Flash' : '시뮬레이션 모드';
            }
            showToast('설정이 정상적으로 저장되었습니다.');
        });

        // Theme choices (Visual feedback inside modal, real save happens on modal save)
        darkThemeBtn.addEventListener('click', () => {
            settings.theme = 'dark';
            darkThemeBtn.classList.add('active');
            lightThemeBtn.classList.remove('active');
        });

        lightThemeBtn.addEventListener('click', () => {
            settings.theme = 'light';
            lightThemeBtn.classList.add('active');
            darkThemeBtn.classList.remove('active');
        });

        // Key visibility toggler
        toggleApiVisibilityBtn.addEventListener('click', () => {
            if (apiKeyInput.type === 'password') {
                apiKeyInput.type = 'text';
                eyeIcon.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
            } else {
                apiKeyInput.type = 'password';
                eyeIcon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
            }
        });

        // Export Data
        exportDataBtn.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ chats, settings }));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `lumina_chat_backup_${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast('백업 파일이 다운로드되었습니다.');
        });

        // Import Data triggers file click
        importDataBtn.addEventListener('click', () => {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (parsed.chats && Array.isArray(parsed.chats)) {
                        chats = parsed.chats;
                        saveChats();
                    }
                    if (parsed.settings) {
                        settings = { ...settings, ...parsed.settings };
                        saveSettings();
                    }
                    showToast('성공적으로 대화 내역을 복구했습니다.');
                    
                    // Reload active chat
                    if (chats.length > 0) {
                        selectChat(chats[0].id);
                    } else {
                        showWelcomeScreen();
                        renderChatList();
                    }
                    closeModal();
                } catch (err) {
                    console.error('임포트 실패:', err);
                    alert('올바른 백업 파일(JSON) 형식이 아닙니다.');
                }
            };
            reader.readAsText(file);
        });

        // Delete All data
        clearAllDataBtn.addEventListener('click', () => {
            if (confirm('⚠️ 경고! 현재 로그인된 사용자의 모든 대화 목록과 설정이 완전히 지워지며 복구할 수 없습니다. 계속하시겠습니까?')) {
                if (currentUser) {
                    localStorage.removeItem(`lumina_chats_${currentUser.username}`);
                    localStorage.removeItem(`lumina_settings_${currentUser.username}`);
                }
                chats = [];
                settings = {
                    apiKey: DEFAULT_API_KEY,
                    theme: 'dark',
                    persona: 'companion'
                };
                saveSettings();
                saveChats();
                
                activeChatId = null;
                showWelcomeScreen();
                renderChatList();
                closeModal();
                showToast('모든 데이터가 초기화되었습니다.');
            }
        });
    }

    // Run on startup
    init();

})();

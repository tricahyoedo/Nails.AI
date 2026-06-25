// Nails.AI - Generative AI Client Controller

document.addEventListener('DOMContentLoaded', () => {
  // Socket.IO connection
  const socket = io();

  // State Variables
  let threads = [];
  let currentThreadId = null;
  let activeStreamBuffer = "";
  let isStreaming = false;

  // Local Storage Settings
  let aiSettings = {
    model: 'nails-v2', // represents Nails Engine v2 on backend
    temperature: 0.7,
    apiKey: ''
  };

  // Caching DOM Elements
  const globalBannerEl = document.getElementById('global-broadcast-banner');
  const bannerTextEl = document.getElementById('banner-text');

  // Sidebar Elements
  const threadsContainer = document.getElementById('threads-container');
  const newChatTrigger = document.getElementById('new-chat-trigger');
  const settingsTrigger = document.getElementById('settings-trigger');
  const activeModelNameEl = null; // removed from UI
  const statPesanEl = null;
  const statPromptEl = null;

  // AI Chat Terminal Elements
  const aiChatBox = document.getElementById('ai-chat-box');
  const welcomeCenterpiece = document.getElementById('welcome-centerpiece');
  const aiChatInput = document.getElementById('ai-chat-input');
  const sendAiBtn = document.getElementById('send-ai-btn');

  // Settings Modal Elements
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const settingAiModel = document.getElementById('setting-ai-model');
  const settingTemperature = document.getElementById('setting-temperature');
  const temperatureVal = document.getElementById('temperature-val');
  const settingApiKey = document.getElementById('setting-api-key');
  const toggleKeyVisibility = document.getElementById('toggle-key-visibility');

  // Sidebar Collapse Elements
  const sidebarPanel = document.querySelector('.sidebar-panel');
  const appLayoutWrapper = document.querySelector('.app-layout-wrapper');
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const reopenBtn = document.getElementById('sidebar-reopen-btn');

  // Sidebar Collapse Logic
  if (collapseBtn && reopenBtn) {
    collapseBtn.addEventListener('click', () => {
      sidebarPanel.classList.add('collapsed');
      appLayoutWrapper.classList.add('sidebar-collapsed');
      reopenBtn.classList.remove('hidden');
    });

    reopenBtn.addEventListener('click', () => {
      sidebarPanel.classList.remove('collapsed');
      appLayoutWrapper.classList.remove('sidebar-collapsed');
      reopenBtn.classList.add('hidden');
    });
  }

  // -------------------------------------------------------------
  // INITIALIZATION & STATE RECOVERY
  // -------------------------------------------------------------

  function initApp() {
    // Load Settings
    const storedSettings = localStorage.getItem('nails_ai_settings');
    if (storedSettings) {
      aiSettings = JSON.parse(storedSettings);
      settingAiModel.value = aiSettings.model;
      settingTemperature.value = aiSettings.temperature;
      temperatureVal.textContent = aiSettings.temperature;
      settingApiKey.value = aiSettings.apiKey;
      updateModelDisplay();
    }

    // Load Chats Threads
    const storedThreads = localStorage.getItem('nails_ai_threads');
    if (storedThreads) {
      threads = JSON.parse(storedThreads);
    }

    if (threads.length === 0) {
      // Create empty thread if none exists to display welcome centerpiece
      createNewThread(true);
    } else {
      // Restore the latest active thread
      currentThreadId = threads[0].id;
      renderThreadsSidebar();
      loadThreadMessages(currentThreadId);
    }
  }

  // -------------------------------------------------------------
  // WEBSOCKET REAL-TIME SYNC
  // -------------------------------------------------------------

  socket.on('global-notification', (data) => {
    showGlobalNotification(data.message);
  });

  // -------------------------------------------------------------
  // THREADS STATE MANAGEMENT (CHATGPT-STYLE)
  // -------------------------------------------------------------

  function createNewThread(isEmpty = false) {
    const id = 'thread_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newThread = {
      id: id,
      title: 'Obrolan Baru',
      messages: []
    };

    threads.unshift(newThread);
    saveThreadsToStorage();

    currentThreadId = id;
    renderThreadsSidebar();
    loadThreadMessages(id);
  }

  function deleteThread(id, e) {
    if (e) e.stopPropagation();
    if (isStreaming) return;

    threads = threads.filter(t => t.id !== id);
    saveThreadsToStorage();

    if (currentThreadId === id) {
      if (threads.length > 0) {
        currentThreadId = threads[0].id;
      } else {
        createNewThread(true);
        return;
      }
    }

    renderThreadsSidebar();
    loadThreadMessages(currentThreadId);
  }

  function renameThreadPrompt(id, e) {
    if (e) e.stopPropagation();
    const thread = threads.find(t => t.id === id);
    if (!thread) return;

    const modal = document.getElementById('rename-modal');
    const inputField = document.getElementById('rename-input-field');
    const saveBtn = document.getElementById('save-rename-btn');
    const cancelBtn = document.getElementById('cancel-rename-btn');

    // Pre-fill the input with the current title
    inputField.value = thread.title;
    modal.classList.remove('hidden');
    setTimeout(() => inputField.focus(), 100);

    function closeModal() {
      modal.classList.add('hidden');
      saveBtn.replaceWith(saveBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    }

    document.getElementById('save-rename-btn').addEventListener('click', () => {
      const newTitle = inputField.value.trim();
      if (newTitle) {
        thread.title = newTitle;
        saveThreadsToStorage();
        renderThreadsSidebar();
      }
      closeModal();
    });

    document.getElementById('cancel-rename-btn').addEventListener('click', closeModal);

    inputField.onkeydown = (ev) => {
      if (ev.key === 'Enter') document.getElementById('save-rename-btn').click();
      if (ev.key === 'Escape') closeModal();
    };
  }

  function selectThread(id) {
    if (isStreaming) return;
    currentThreadId = id;
    renderThreadsSidebar();
    loadThreadMessages(id);
  }

  function saveThreadsToStorage() {
    localStorage.setItem('nails_ai_threads', JSON.stringify(threads));
  }

  // Load and toggle welcome centerpiece vs chat bubble screen
  function loadThreadMessages(id) {
    aiChatBox.innerHTML = '';
    const thread = threads.find(t => t.id === id);
    if (!thread) return;

    if (thread.messages.length === 0) {
      // Empty thread - Show welcome centerpiece
      welcomeCenterpiece.classList.remove('hidden');
      aiChatBox.classList.add('hidden');
    } else {
      // Has messages - Hide centerpiece, show conversation log
      welcomeCenterpiece.classList.add('hidden');
      aiChatBox.classList.remove('hidden');

      thread.messages.forEach(msg => {
        if (msg.sender === 'user') {
          renderUserBubble(msg.text);
        } else {
          renderAiBubble(msg.text);
        }
      });
    }

    updateSessionStatistics(thread);
    aiChatBox.scrollTop = aiChatBox.scrollHeight;
  }

  // Session stats removed — function kept as stub to avoid errors
  function updateSessionStatistics(thread) {
    // Stats UI removed, nothing to update
  }

  function renderThreadsSidebar() {
    threadsContainer.innerHTML = '';
    const emptyState = document.getElementById('history-empty-state');

    if (threads.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
    } else {
      if (emptyState) emptyState.style.display = 'none';
    }

    threads.forEach(t => {
      const activeClass = t.id === currentThreadId ? 'active' : '';
      const pinnedClass = t.pinned ? 'pinned' : '';
      const div = document.createElement('div');
      div.className = `thread-item ${activeClass} ${pinnedClass}`.trim();

      div.innerHTML = `
        <div class="thread-title-wrapper">
          ${t.pinned ? `<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" class="pin-indicator" style="flex-shrink:0; color: var(--accent-purple-light);"><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" class="thread-icon" style="flex-shrink:0;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`}
          <span class="thread-text">${escapeHtml(t.title)}</span>
        </div>
        <div class="thread-actions">
          <button class="thread-action-btn three-dot" title="Opsi">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <circle cx="12" cy="5" r="1.5"></circle>
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="12" cy="19" r="1.5"></circle>
            </svg>
          </button>
        </div>
        <div class="thread-dropdown hidden">
          <button class="thread-dropdown-item pin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <line x1="12" y1="17" x2="12" y2="22"></line>
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
            </svg>
            <span>${t.pinned ? 'Lepas Sematan' : 'Sematkan'}</span>
          </button>
          <button class="thread-dropdown-item rename">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span>Ganti nama</span>
          </button>
          <button class="thread-dropdown-item delete-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Hapus</span>
          </button>
        </div>
      `;

      // Main click = select thread
      div.addEventListener('click', () => selectThread(t.id));

      // 3-dot button toggles dropdown
      const threeDotBtn = div.querySelector('.three-dot');
      const dropdown = div.querySelector('.thread-dropdown');
      threeDotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close all other open dropdowns
        document.querySelectorAll('.thread-dropdown:not(.hidden)').forEach(d => {
          if (d !== dropdown) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
      });

      div.querySelector('.pin').addEventListener('click', (e) => {
        e.stopPropagation();

        if (!t.pinned) {
          // Check max 3 pinned
          const pinnedCount = threads.filter(x => x.pinned).length;
          if (pinnedCount >= 3) {
            showGlobalNotification('Maksimal 3 obrolan yang bisa disematkan');
            document.querySelectorAll('.thread-dropdown:not(.hidden)').forEach(d => d.classList.add('hidden'));
            return;
          }
          // Pin: move to top
          t.pinned = true;
          const idx = threads.findIndex(x => x.id === t.id);
          threads.splice(idx, 1);
          threads.unshift(t);
        } else {
          // Unpin: move below all other pinned threads
          t.pinned = false;
          const idx = threads.findIndex(x => x.id === t.id);
          threads.splice(idx, 1);
          const firstNonPinned = threads.findIndex(x => !x.pinned);
          threads.splice(firstNonPinned === -1 ? threads.length : firstNonPinned, 0, t);
        }

        saveThreadsToStorage();
        renderThreadsSidebar();
      });

      div.querySelector('.rename').addEventListener('click', (e) => renameThreadPrompt(t.id, e));
      div.querySelector('.delete-item').addEventListener('click', (e) => deleteThread(t.id, e));

      threadsContainer.appendChild(div);
    });

    // Close dropdown when clicking anywhere else
    document.addEventListener('click', () => {
      document.querySelectorAll('.thread-dropdown:not(.hidden)').forEach(d => d.classList.add('hidden'));
    }, { once: true });
  }

  newChatTrigger.addEventListener('click', () => createNewThread(true));

  // -------------------------------------------------------------
  // GENERATIVE STREAMING WORKFLOW
  // -------------------------------------------------------------

  function handlePromptSubmit(customText = null) {
    if (isStreaming) return;
    const text = customText !== null ? customText.trim() : aiChatInput.value.trim();
    if (!text) return;

    // Reset textarea heights
    aiChatInput.value = '';
    aiChatInput.style.height = 'auto';

    // Toggle showcase centerpiece views
    welcomeCenterpiece.classList.add('hidden');
    aiChatBox.classList.remove('hidden');

    // 1. Save & Render User prompt
    renderUserBubble(text);
    saveMessageToThread('user', text);

    // Auto rename thread if it is default name and it's the first prompt
    const activeThread = threads.find(t => t.id === currentThreadId);
    if (activeThread && activeThread.messages.filter(m => m.sender === 'user').length === 1 && activeThread.title === 'Obrolan Baru') {
      activeThread.title = text.length > 20 ? text.substring(0, 20) + '...' : text;
    }

    // Always move the active thread to the top (non-pinned threads only)
    const threadIdx = threads.findIndex(t => t.id === currentThreadId);
    if (threadIdx > 0 && !activeThread.pinned) {
      threads.splice(threadIdx, 1);
      // Insert after all pinned threads
      const firstNonPinned = threads.findIndex(t => !t.pinned);
      threads.splice(firstNonPinned === -1 ? 0 : firstNonPinned, 0, activeThread);
    }
    saveThreadsToStorage();
    renderThreadsSidebar();

    // Update active counters
    updateSessionStatistics(activeThread);

    // 2. Prepare AI streaming bubble container
    isStreaming = true;
    activeStreamBuffer = "";

    // Change icon to square (stop) using SVG
    sendAiBtn.innerHTML = `
      <svg id="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
        <path d="M6 6h12v12H6z"/>
      </svg>
    `;
    sendAiBtn.classList.add('is-streaming');

    // Create streaming bubble on UI
    const aiBubbleRow = document.createElement('div');
    aiBubbleRow.className = 'msg-row ai-side';
    aiBubbleRow.id = 'active-streaming-row';
    aiBubbleRow.innerHTML = `
      <div class="ai-avatar" style="padding: 0; background: transparent; box-shadow: none;">
        <img src="logo.png" style="width: 100%; height: 100%; border-radius: 10px; object-fit: cover; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
      </div>
      <div class="chat-bubble">
        <span class="typing-caret"></span>
      </div>
    `;
    aiChatBox.appendChild(aiBubbleRow);
    aiChatBox.scrollTop = aiChatBox.scrollHeight;

    // 3. Emit to backend
    socket.emit('send-prompt', {
      user: 'NailsDev',
      prompt: text,
      history: activeThread ? activeThread.messages : [],
      chatId: currentThreadId,
      apiKey: aiSettings.apiKey,
      model: aiSettings.model
    });
  }

  // Handle generative stream hooks
  socket.on('prompt-start', (data) => {
    if (data.chatId !== currentThreadId) return;
    activeStreamBuffer = "";
  });

  socket.on('prompt-chunk', (data) => {
    if (data.chatId !== currentThreadId) return;
    if (!isStreaming) return;

    activeStreamBuffer += data.text;
    const streamRow = document.getElementById('active-streaming-row');
    if (streamRow) {
      const bubble = streamRow.querySelector('.chat-bubble');
      bubble.innerHTML = parseMarkdownToHtml(activeStreamBuffer) + `<span class="typing-caret"></span>`;
      aiChatBox.scrollTop = aiChatBox.scrollHeight;
    }
  });

  socket.on('prompt-end', (data) => {
    if (data.chatId !== currentThreadId) return;
    if (!isStreaming) return;

    const streamRow = document.getElementById('active-streaming-row');
    if (streamRow) {
      streamRow.removeAttribute('id');
      const bubble = streamRow.querySelector('.chat-bubble');
      bubble.innerHTML = parseMarkdownToHtml(activeStreamBuffer);
    }

    saveMessageToThread('ai', activeStreamBuffer);

    // Post generation stats updates
    const activeThread = threads.find(t => t.id === currentThreadId);
    updateSessionStatistics(activeThread);

    isStreaming = false;
    activeStreamBuffer = "";

    sendAiBtn.innerHTML = `
      <svg id="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
      </svg>
    `;
    sendAiBtn.classList.remove('is-streaming');
  });

  function saveMessageToThread(sender, text) {
    const thread = threads.find(t => t.id === currentThreadId);
    if (thread) {
      thread.messages.push({ sender, text });
      saveThreadsToStorage();
    }
  }

  // -------------------------------------------------------------
  // DYNAMIC HTML BUBBLE RENDERING
  // -------------------------------------------------------------

  function renderUserBubble(text) {
    const row = document.createElement('div');
    row.className = 'msg-row user-side';
    row.innerHTML = `
      <div class="chat-bubble">${escapeHtml(text)}</div>
      <div class="user-avatar">
        <svg viewBox="0 0 24 24" fill="#ffffff" width="20" height="20">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 10.17 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"/>
        </svg>
      </div>
    `;
    aiChatBox.appendChild(row);
    aiChatBox.scrollTop = aiChatBox.scrollHeight;
  }

  function renderAiBubble(text) {
    const row = document.createElement('div');
    row.className = 'msg-row ai-side';

    const parsedContent = parseMarkdownToHtml(text);
    row.innerHTML = `
      <div class="ai-avatar" style="padding: 0; background: transparent; box-shadow: none;">
        <img src="logo.png" style="width: 100%; height: 100%; border-radius: 10px; object-fit: cover; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
      </div>
      <div class="chat-bubble">${parsedContent}</div>
    `;

    aiChatBox.appendChild(row);
    aiChatBox.scrollTop = aiChatBox.scrollHeight;
  }

  // Bind Input Controls
  aiChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePromptSubmit();
    }
  });

  sendAiBtn.addEventListener('click', () => {
    if (isStreaming) {
      isStreaming = false;
      sendAiBtn.innerHTML = `
        <svg id="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
        </svg>
      `;
      sendAiBtn.classList.remove('is-streaming');

      const streamRow = document.getElementById('active-streaming-row');
      if (streamRow) {
        streamRow.removeAttribute('id');
        const bubble = streamRow.querySelector('.chat-bubble');
        bubble.innerHTML = parseMarkdownToHtml(activeStreamBuffer);
        saveMessageToThread('ai', activeStreamBuffer);
      }
      activeStreamBuffer = "";
    } else {
      handlePromptSubmit();
    }
  });

  aiChatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight - 4) + 'px';
  });

  // Bind suggestion welcome cards click events
  document.querySelectorAll('.rec-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      handlePromptSubmit(prompt);
    });
  });

  // -------------------------------------------------------------
  // REGEX-BASED CUSTOM MARKDOWN PARSER WITH SYNTAX COLORING
  // -------------------------------------------------------------

  function parseMarkdownToHtml(md) {
    let html = md;

    // 1. Parse Triple Backtick Code Blocks ( ```lang ... ``` )
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)(```|$)/g;
    html = html.replace(codeBlockRegex, (match, lang, codeContent) => {
      const cleanLang = lang || 'text';
      const highlightedCode = colorizeCodeSyntax(codeContent.trim(), cleanLang);

      return `
        <pre><code class="language-${cleanLang}">${highlightedCode}</code><button class="code-copy-btn" onclick="copyCodeBlock(this)"><i class="fa-regular fa-clipboard"></i> Copy</button></pre>
      `;
    });

    // 2. Parse Markdown Tables
    const tableRegex = /(\|.*\|(?:\r?\n\|.*\|)*)/g;
    html = html.replace(tableRegex, (tableContent) => {
      const rows = tableContent.trim().split('\n');
      if (rows.length < 2) return tableContent;

      let tableHtml = '<table>';
      let hasHeader = false;
      const isDelimiter = rows[1].includes('-') && rows[1].includes('|');

      rows.forEach((row, index) => {
        if (index === 1 && isDelimiter) {
          hasHeader = true;
          return;
        }

        const cols = row.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
        if (cols.length === 0) return;

        if (index === 0) {
          tableHtml += '<thead><tr>';
          cols.forEach(col => {
            tableHtml += `<th>${parseInlineMarkdown(col)}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr>';
          cols.forEach(col => {
            tableHtml += `<td>${parseInlineMarkdown(col)}</td>`;
          });
          tableHtml += '</tr>';
        }
      });

      tableHtml += '</tbody></table>';
      return tableHtml;
    });

    // 3. Parse blockquotes (> block)
    html = html.replace(/^\>\s+(.*)$/gm, '<blockquote>$1</blockquote>');

    // 4. Parse Lists (Ordered & Unordered)
    html = html.replace(/^\s*[\-\*\u2022]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    html = html.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<li>$2</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');

    // 5. Parse Headers
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');

    // 6. Parse Paragraph splits
    const paragraphs = html.split(/\n\n+/);
    let finalHtml = "";
    paragraphs.forEach(p => {
      const trimmed = p.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('<pre>') || trimmed.startsWith('<table>') || trimmed.startsWith('<h') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>') || trimmed.startsWith('<blockquote>')) {
        finalHtml += trimmed;
      } else {
        finalHtml += `<p>${parseInlineMarkdown(trimmed)}</p>`;
      }
    });

    return finalHtml;
  }

  function parseInlineMarkdown(text) {
    let parsed = text;
    parsed = parsed.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/`([^`]+)`/g, '<code>$1</code>');
    parsed = parsed.replace(/\n/g, '<br>');
    return parsed;
  }

  function colorizeCodeSyntax(code, lang) {
    let escaped = escapeHtml(code);

    if (lang === 'javascript' || lang === 'js' || lang === 'html') {
      escaped = escaped.replace(/(\/\/[^\n]*)/g, '<span class="code-comment">$1</span>');
      escaped = escaped.replace(/(['"`][^'"`]*['"`])/g, '<span class="code-string">$1</span>');
      const jsKeywords = /\b(const|let|var|function|async|await|return|class|import|from|export|default|extends|if|else|try|catch|throw|new)\b/g;
      escaped = escaped.replace(jsKeywords, '<span class="code-keyword">$1</span>');
      escaped = escaped.replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');
      escaped = escaped.replace(/\b(true|false|null|undefined)\b/g, '<span class="code-boolean">$1</span>');
      escaped = escaped.replace(/\b(\w+)(?=\()/g, '<span class="code-function">$1</span>');
    }
    else if (lang === 'python' || lang === 'py') {
      escaped = escaped.replace(/(#[^\n]*)/g, '<span class="code-comment">$1</span>');
      escaped = escaped.replace(/(['"][^'"]*['"])/g, '<span class="code-string">$1</span>');
      const pyKeywords = /\b(def|class|import|from|return|async|await|try|except|raise|if|else|elif|for|in|while|as|with|pass|lambda)\b/g;
      escaped = escaped.replace(pyKeywords, '<span class="code-keyword">$1</span>');
      escaped = escaped.replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');
      escaped = escaped.replace(/\b(True|False|None)\b/g, '<span class="code-boolean">$1</span>');
      escaped = escaped.replace(/\b(\w+)(?=\()/g, '<span class="code-function">$1</span>');
    }

    return escaped;
  }

  window.copyCodeBlock = function (btn) {
    const pre = btn.parentNode;
    const code = pre.querySelector('code');
    if (!code) return;

    navigator.clipboard.writeText(code.innerText).then(() => {
      btn.innerHTML = `<i class="fa-solid fa-circle-check text-green"></i> Copied!`;
      btn.style.borderColor = 'var(--accent-green)';

      setTimeout(() => {
        btn.innerHTML = `<i class="fa-regular fa-clipboard"></i> Copy`;
        btn.style.borderColor = 'rgba(255, 255, 255, 0.06)';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  };

  // -------------------------------------------------------------
  // COLLAPSIBLE SETTINGS PANEL (SIDEBAR FOOTER)
  // -------------------------------------------------------------

  const settingsCollapsePanel = document.getElementById('settings-collapse-panel');
  const settingsChevron = document.getElementById('settings-chevron');

  // Inline settings elements
  const settingTemperatureInline = document.getElementById('setting-temperature-inline');
  const temperatureValInline = document.getElementById('temperature-val-inline');

  // Sync inline settings from stored settings
  if (settingTemperatureInline && aiSettings.temperature) {
    settingTemperatureInline.value = aiSettings.temperature;
    if (temperatureValInline) temperatureValInline.textContent = aiSettings.temperature;
  }

  // Toggle collapse on settings button click
  settingsTrigger.addEventListener('click', () => {
    const isOpen = settingsCollapsePanel.classList.toggle('open');
    settingsTrigger.classList.toggle('open', isOpen);
  });

  // Live update temperature display and save
  if (settingTemperatureInline) {
    settingTemperatureInline.addEventListener('input', function () {
      if (temperatureValInline) temperatureValInline.textContent = this.value;
      aiSettings.temperature = parseFloat(this.value);
      localStorage.setItem('nails_ai_settings', JSON.stringify(aiSettings));
    });
  }

  // Old modal temperature slider (keep for modal if still present)
  if (settingTemperature) {
    settingTemperature.addEventListener('input', function () {
      if (temperatureVal) temperatureVal.textContent = this.value;
    });
  }

  if (toggleKeyVisibility) {
    toggleKeyVisibility.addEventListener('click', () => {
      const type = settingApiKey.getAttribute('type') === 'password' ? 'text' : 'password';
      settingApiKey.setAttribute('type', type);

      const icon = toggleKeyVisibility.querySelector('i');
      if (type === 'text') {
        icon.className = 'fa-solid fa-eye';
      } else {
        icon.className = 'fa-solid fa-eye-slash';
      }
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      if (settingAiModel) aiSettings.model = settingAiModel.value;
      if (settingTemperature) aiSettings.temperature = parseFloat(settingTemperature.value);
      if (settingApiKey) aiSettings.apiKey = settingApiKey.value.trim();

      localStorage.setItem('nails_ai_settings', JSON.stringify(aiSettings));
      showGlobalNotification(`⚙️ <strong>Pengaturan Disimpan!</strong>`);
    });
  }

  function updateModelDisplay() {
    // activeModelNameEl removed from UI, no-op
  }

  // -------------------------------------------------------------
  // HELPER UTILITIES
  // -------------------------------------------------------------

  function showGlobalNotification(message) {
    bannerTextEl.innerHTML = message;
    globalBannerEl.classList.remove('hidden');
    globalBannerEl.classList.add('show');

    setTimeout(() => {
      globalBannerEl.classList.remove('show');
      setTimeout(() => {
        globalBannerEl.classList.add('hidden');
      }, 500);
    }, 6000);
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
  }

  // Run initialization
  initApp();
});

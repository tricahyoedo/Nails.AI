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
  const activeModelNameEl = document.getElementById('active-model-name');
  const statPesanEl = document.getElementById('stat-pesan');
  const statPromptEl = document.getElementById('stat-prompt');
  
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

    const newTitle = prompt("Masukkan judul baru untuk obrolan ini:", thread.title);
    if (newTitle && newTitle.trim()) {
      thread.title = newTitle.trim();
      saveThreadsToStorage();
      renderThreadsSidebar();
    }
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

  // Reactive counters updater
  function updateSessionStatistics(thread) {
    if (!thread) {
      statPesanEl.textContent = '0';
      statPromptEl.textContent = '0';
      return;
    }
    
    const promptsCount = thread.messages.filter(m => m.sender === 'user').length;
    const totalCount = thread.messages.length;

    statPromptEl.textContent = promptsCount.toString();
    statPesanEl.textContent = totalCount.toString();
  }

  function renderThreadsSidebar() {
    threadsContainer.innerHTML = '';
    threads.forEach(t => {
      const activeClass = t.id === currentThreadId ? 'active' : '';
      const div = document.createElement('div');
      div.className = `thread-item ${activeClass}`;
      
      div.innerHTML = `
        <div class="thread-title-wrapper">
          <i class="fa-regular fa-message thread-icon"></i>
          <span class="thread-text">${escapeHtml(t.title)}</span>
        </div>
        <div class="thread-actions">
          <button class="thread-action-btn edit" title="Ubah Nama"><i class="fa-solid fa-pen"></i></button>
          <button class="thread-action-btn delete" title="Hapus Chat"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;

      // Attach clicks
      div.addEventListener('click', () => selectThread(t.id));
      div.querySelector('.edit').addEventListener('click', (e) => renameThreadPrompt(t.id, e));
      div.querySelector('.delete').addEventListener('click', (e) => deleteThread(t.id, e));

      threadsContainer.appendChild(div);
    });
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
      saveThreadsToStorage();
      renderThreadsSidebar();
    }

    // Update active counters
    updateSessionStatistics(activeThread);

    // 2. Prepare AI streaming bubble container
    isStreaming = true;
    activeStreamBuffer = "";
    
    // Create streaming bubble on UI
    const aiBubbleRow = document.createElement('div');
    aiBubbleRow.className = 'msg-row ai-side';
    aiBubbleRow.id = 'active-streaming-row';
    aiBubbleRow.innerHTML = `
      <div class="ai-avatar">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
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
        <i class="fa-solid fa-user"></i>
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
      <div class="ai-avatar">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
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

  sendAiBtn.addEventListener('click', () => handlePromptSubmit());
  
  aiChatInput.addEventListener('input', function() {
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

  window.copyCodeBlock = function(btn) {
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
  // CONFIGURATION MODAL (SETTINGS PANEL)
  // -------------------------------------------------------------

  settingsTrigger.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });

  function closeSettings() {
    settingsModal.classList.add('hidden');
  }

  closeSettingsBtn.addEventListener('click', closeSettings);
  cancelSettingsBtn.addEventListener('click', closeSettings);

  settingTemperature.addEventListener('input', function() {
    temperatureVal.textContent = this.value;
  });

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

  saveSettingsBtn.addEventListener('click', () => {
    aiSettings.model = settingAiModel.value;
    aiSettings.temperature = parseFloat(settingTemperature.value);
    aiSettings.apiKey = settingApiKey.value.trim();

    localStorage.setItem('nails_ai_settings', JSON.stringify(aiSettings));
    updateModelDisplay();
    closeSettings();

    showGlobalNotification(`⚙️ <strong>Sistem Terkonfigurasi:</strong> Model AI diubah ke <strong>${aiSettings.model === 'nails-v2' ? 'Nails Engine v2' : aiSettings.model.toUpperCase()}</strong>!`);
  });

  function updateModelDisplay() {
    if (aiSettings.model === 'nails-v2') {
      activeModelNameEl.textContent = 'Nails Engine v2';
    } else if (aiSettings.model === 'groq-llama') {
      activeModelNameEl.textContent = 'Groq Llama 3 Model';
    } else {
      activeModelNameEl.textContent = 'Claude 3.5 Sonnet Model';
    }
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
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Run initialization
  initApp();
});

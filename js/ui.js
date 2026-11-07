export class UI {
  constructor() {
    this.overlay = document.getElementById('modal-overlay');
    this.modalTitle = document.getElementById('modal-title');
    this.modalMessage = document.getElementById('modal-message');
    this.modalButtons = document.getElementById('modal-buttons');
    this.ruleHint = document.getElementById('rule-hint');
    this.levelBtns = document.querySelectorAll('.level-btn');
    this.restartBtn = document.getElementById('restart-btn');

    // Score pill elements
    this.scorePill = document.getElementById('score-pill');
    this.scoreTime = document.getElementById('score-time');
    this.scoreMoves = document.getElementById('score-moves');

    // History modal elements
    this.historyOverlay = document.getElementById('history-overlay');
    this.historyTbody = document.getElementById('history-tbody');
    this.historyEmpty = document.getElementById('history-empty');
    this.historyBtn = document.getElementById('history-btn');
    this.historyClose = document.getElementById('history-close');

    // Help modal elements
    this.helpOverlay = document.getElementById('help-overlay');
    this.helpClose = document.getElementById('help-close');
    this.helpBtn = document.getElementById('help-btn');

    document.getElementById('rule-hint-close').addEventListener('click', () => {
      this.ruleHint.classList.add('hidden');
    });

    this.helpClose.addEventListener('click', () => this.hideHelp());
    this.helpOverlay.addEventListener('click', (e) => {
      if (e.target === this.helpOverlay) this.hideHelp();
    });
    this.helpBtn.addEventListener('click', () => this.showHelp());

    this.historyClose.addEventListener('click', () => {
      this.hideHistoryModal();
    });
    this.historyOverlay.addEventListener('click', (e) => {
      if (e.target === this.historyOverlay) this.hideHistoryModal();
    });

    this._levelCb = null;
    this._restartCb = null;

    this.levelBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const lvl = parseInt(btn.dataset.level);
        if (this._levelCb) this._levelCb(lvl);
      });
    });

    this.restartBtn.addEventListener('click', () => {
      if (this._restartCb) this._restartCb();
    });
  }

  onLevelSelect(cb) { this._levelCb = cb; }
  onRestart(cb) { this._restartCb = cb; }

  setActiveLevel(id) {
    document.getElementById('level-title').textContent = `第 ${id} 关`;
    this.levelBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.level) === id);
    });
  }

  showRuleHint() {
    this.ruleHint.classList.remove('hidden');
  }

  showModal(title, message, buttons) {
    this.modalTitle.textContent = title;
    this.modalMessage.textContent = message;
    this.modalButtons.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = `modal-btn ${b.style || 'primary'}`;
      btn.textContent = b.text;
      btn.addEventListener('click', () => {
        this.hideModal();
        if (b.action) b.action();
      });
      this.modalButtons.appendChild(btn);
    });
    this.overlay.classList.remove('hidden');
  }

  hideModal() {
    this.overlay.classList.add('hidden');
  }

  // 通关面板带关卡选择入口
  showVictoryModal(title, message, buttons, levelOptions) {
    this.modalTitle.textContent = title;
    this.modalMessage.textContent = message;
    this.modalButtons.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = `modal-btn ${b.style || 'primary'}`;
      btn.textContent = b.text;
      btn.addEventListener('click', () => {
        this.hideModal();
        if (b.action) b.action();
      });
      this.modalButtons.appendChild(btn);
    });
    // 关卡选择行
    if (levelOptions && levelOptions.length > 0) {
      const row = document.createElement('div');
      row.className = 'modal-level-row';
      const label = document.createElement('span');
      label.className = 'modal-level-label';
      label.textContent = '再试一关';
      row.appendChild(label);
      levelOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'modal-level-chip';
        btn.textContent = opt.text;
        btn.addEventListener('click', () => {
          this.hideModal();
          if (opt.action) opt.action();
        });
        row.appendChild(btn);
      });
      this.modalButtons.appendChild(row);
    }
    this.overlay.classList.remove('hidden');
  }

  showHelp() { this.helpOverlay.classList.remove('hidden'); }
  hideHelp() { this.helpOverlay.classList.add('hidden'); }

  // --- Score display ---
  updateScoreDisplay(time, moves) {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const secStr = secs < 10 ? '0' + secs : '' + secs;
    this.scoreTime.textContent = `${String(mins).padStart(2, '0')}:${secStr}`;
    this.scoreMoves.textContent = `${moves} 步`;
  }

  showScoreDisplay() {
    this.scorePill.classList.remove('hidden');
  }

  hideScoreDisplay() {
    this.scorePill.classList.add('hidden');
  }

  // --- History modal ---
  onHistoryClick(cb) {
    this.historyBtn.addEventListener('click', () => {
      if (cb) cb();
    });
  }

  showHistoryModal(records, bestIndex) {
    this.historyTbody.innerHTML = '';
    if (records.length === 0) {
      this.historyEmpty.classList.remove('hidden');
      this.historyOverlay.classList.remove('hidden');
      return;
    }
    this.historyEmpty.classList.add('hidden');

    // Sort by timeSeconds ascending
    const sorted = records.map((r, i) => ({ ...r, _origIdx: i }));
    sorted.sort((a, b) => a.timeSeconds - b.timeSeconds);

    sorted.forEach((r, idx) => {
      const tr = document.createElement('tr');
      if (r._origIdx === bestIndex) tr.classList.add('best-record');

      const d = new Date(r.timestamp);
      const dateStr = `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      const timeMins = Math.floor(r.timeSeconds / 60);
      const timeSecs = (r.timeSeconds % 60).toFixed(1);
      const timeStr = timeMins > 0 ? `${timeMins}分${timeSecs}秒` : `${timeSecs}秒`;

      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${timeStr}</td>
        <td>${r.moves}</td>
        <td>${r.maxBufferUsed}</td>
        <td>${r.assisted ? '是' : '否'}</td>
        <td style="color:${r.won ? 'var(--primary)' : 'var(--danger)'}">${r.won ? '通关' : '失败'}</td>
      `;
      this.historyTbody.appendChild(tr);
    });

    this.historyOverlay.classList.remove('hidden');
  }

  hideHistoryModal() {
    this.historyOverlay.classList.add('hidden');
  }
}

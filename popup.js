browser.browserAction.setBadgeText({ text: '' });
browser.storage.local.set({ unreadCount: 0 }).catch();

// listen for refetch success
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RELOAD') {
    loadCalls();
  }
});

async function loadCalls() {
  const result = await browser.storage.local.get('callLogs');
  const logs = result.callLogs || [];

  const list = document.getElementById('list');
  list.innerHTML = '';

  if (logs.length === 0) {
    list.innerHTML = 'No calls';
    return;
  }

  logs.forEach((log) => {
    function maskNumber(num) {
      if (num.length <= 4) return num;
      return '*'.repeat(num.length - 4) + num.slice(-4);
    }
    const div = document.createElement('div');
    div.style.marginBottom = '10px';
    div.style.paddingBottom = '5px';
    div.style.borderBottom = '1px solid gray';

    div.innerHTML = `
      <strong>${log.callerName}</strong><br>
      <span class="phone-number" data-full="${log.callerNumber}">
        ${maskNumber(log.callerNumber)}
      </span><br>
      <small>${new Date(log.receivedAt).toLocaleString()}</small>
    `;

    const numberEl = div.querySelector('.phone-number');

    numberEl.addEventListener('click', () => {
      const isMasked = numberEl.classList.toggle('revealed');

      if (isMasked) {
        numberEl.textContent = numberEl.dataset.full;
      } else {
        numberEl.textContent = maskNumber(numberEl.dataset.full);
      }
    });

    list.appendChild(div);
  });
}

loadCalls();

async function refreshData() {
  // tell background to fetch fresh data
  browser.runtime.sendMessage({ type: 'REFRESH_CALLS' });

  // wait a bit for update (simple approach)
  setTimeout(loadCalls, 500);
}

document.getElementById('refreshBtn').addEventListener('click', () => {
  browser.runtime.sendMessage({ type: 'REFRESH_CALLS' });
});

document.getElementById('retryBtn').addEventListener('click', () => {
  browser.runtime.sendMessage({ type: 'RECONNECT_WS' });
});

const connectedIcon = `<svg width="16" height="16" fill="green" style="margin-bottom:-2px"><circle cx="8" cy="8" r="8"/></svg>`;
const disconnectedIcon = `<svg width="16" height="16" fill="red"><circle cx="8" cy="8" r="8"/></svg>`;

async function socketStatus() {
  const { isConnected } = await browser.storage.local.get('isConnected');
  let node = document.getElementById('isConnected');

  if (isConnected) {
    node.innerHTML = connectedIcon;
  } else {
    node.innerHTML = disconnectedIcon;
  }
}
// initial check status
socketStatus();

// refresh UI every 2 sec (live feel)
setInterval(() => {
  socketStatus();
}, 2000);

// handler key input
const keyParent = document.getElementById('key-input-parent');
const keyBtn = document.getElementById('keyBtn');

let keyBtnClicked = false;

keyBtn?.addEventListener('click', async () => {
  if (!keyBtnClicked) {
    // get value from storage
    let { key = '' } = await browser.storage.local.get('key');

    // create input
    keyParent.innerHTML = `
      <input id="key-input" value="${key}" type="text" placeholder="Provide secret key" />
    `;

    const input = document.getElementById('key-input');

    input.focus(); // nice UX

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        console.log('Submitted:', input.value);

        await browser.storage.local.set({ key: input.value });

        browser.runtime.sendMessage({ type: 'KEY_UPDATE' });

        // optional: auto close after submit
        keyParent.innerHTML = '';
        keyBtnClicked = false;
      }
    });

    keyBtnClicked = true;
  } else {
    // remove input
    keyParent.innerHTML = '';
    keyBtnClicked = false;
  }
});

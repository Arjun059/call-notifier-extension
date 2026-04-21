const API_URL = 'http://cn.mealwala.com';
const SOCKET_URI = `ws://cn.mealwala.com/ws`;

// listen for popup trigger
browser.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'REFRESH_CALLS') {
    fetchCalls();
  }
  if (msg.type === 'RECONNECT_WS') {
    connectWebSocket();
  }
  if (msg.type === 'KEY_UPDATE') {
    const { key = '' } = await browser.storage.local.get('key');
    if (!key) {
      handleClear();
    } else {
      // if key is updated we assume the new user use this extension
      // we should clear the previous user data;
      await handleClear();
      fetchCalls();
      connectWebSocket();
    }
  }
});

browser.storage.local.set({ unreadCount: 0 }).catch();
// Refresh Data
async function fetchCalls() {
  const { key = '' } = await browser.storage.local.get('key');

  if (!key) {
    return;
  }

  try {
    const res = await fetch(`${API_URL}/incoming-calls?key=${key}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // "Authorization": "Bearer YOUR_TOKEN" // if needed
      },
    });

    if (!res.ok) {
      throw new Error('API Error: ' + res.status);
    }

    // response is in descending order
    const newCalls = await res.json();

    // expected format:
    // [
    //   {
    //     callerName: string,
    //     callerNumber: string,
    //     receivedAt: string
    //   }
    // ]

    let newly10calls = newCalls.slice(0, 10);

    await browser.storage.local.set({ callLogs: newly10calls });
    browser.runtime.sendMessage({ type: 'RELOAD' });
  } catch (err) {
    console.error('Failed to fetch calls:', err);
  }
}

// WebSocket
let socket = null;

async function connectWebSocket() {
  // 🔴 close existing connection if any
  if (socket) {
    socket.close();
  }

  const { key = '' } = await browser.storage.local.get('key');

  let socketURL = SOCKET_URI + `?key=${key}`;

  socket = new WebSocket(socketURL);

  socket.onopen = async () => {
    console.log('socket: connected');
    await browser.storage.local.set({ isConnected: true });
  };

  socket.onmessage = async (event) => {
    const call = JSON.parse(event.data);

    if (!call?.callerNumber) return;

    const result = await browser.storage.local.get('callLogs');
    let calls = result.callLogs || [];

    calls.unshift(call);
    calls = calls.slice(0, 10);

    let resultCount = await browser.storage.local.get('unreadCount');
    let unread = resultCount.unreadCount || 0;

    unread = parseInt(unread) + 1;
    await browser.storage.local.set({ unreadCount: unread });
    await browser.storage.local.set({ callLogs: calls });

    browser.runtime.sendMessage({ type: 'RELOAD' });

    browser.browserAction.setBadgeText({
      text: String(unread),
    });

    browser.browserAction.setBadgeBackgroundColor({
      color: 'red',
    });

    browser.notifications.create({
      type: 'basic',
      title: 'New Incoming Call',
      message: `${call.callerName} - ${call.callerNumber}`,
    });
  };

  socket.onerror = async (err) => {
    console.error('WebSocket error', err);
    await browser.storage.local.set({ isConnected: false });
  };

  socket.onclose = async (event) => {
    console.log('CLOSED:', event.code, event.reason);
    await browser.storage.local.set({ isConnected: false });
  };
}

// initial socket connection
connectWebSocket();

async function handleClear() {
  // close socket connection
  if (socket) {
    socket.close();
  }

  // clear extension storage
  await browser.storage.local.set({ callLogs: [], unreadCount: 0 });
  browser.runtime.sendMessage({ type: 'RELOAD' });
}

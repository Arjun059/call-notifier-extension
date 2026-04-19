const API_URL = 'http://64.227.163.175:8080';
const SOCKET_URI = `ws://64.227.163.175:8080/ws`;

// listen for popup trigger
http: browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'REFRESH_CALLS') {
    fetchCalls();
  }
  if (msg.type === 'RECONNECT_WS') {
    connectWebSocket();
  }
  if (msg.type === 'KEY_UPDATE') {
    fetchCalls();
    connectWebSocket();
  }
});

let calls = [];
browser.storage.local.set({ unreadCount: 0 }).catch();
// Refresh Data
async function fetchCalls() {
  const { key = '' } = await browser.storage.local.get('key');

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

    const newCalls = await res.json();

    // expected format:
    // [
    //   {
    //     callerName: string,
    //     callerNumber: string,
    //     receivedAt: string
    //   }
    // ]

    calls = newCalls;

    await browser.storage.local.set({ callLogs: calls });
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

  socket = new WebSocket(SOCKET_URI + `?key=${key}`);

  socket.onopen = async () => {
    await browser.storage.local.set({ isConnected: true });
  };

  socket.onmessage = async (event) => {
    const call = JSON.parse(event.data);

    if (!call?.callerNumber) return;

    calls.unshift(call);
    calls = calls.slice(0, 10);

    let resultCount = await browser.storage.local.get('unreadCount');
    let unread = resultCount.unreadCount || 0;

    unread = parseInt(unread) + 1;
    await browser.storage.local.set({ unreadCount: unread });
    await browser.storage.local.set({ callLogs: calls });

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

  socket.onclose = async () => {
    await browser.storage.local.set({ isConnected: false });
  };
}

// initial socket connection
connectWebSocket();

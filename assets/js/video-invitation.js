// Invitations contain a room-scoped guest token, never the Daily account API key.
export const DAILY_HOST = 'georgetech.daily.co';
export function parseVideoInvitation(fragment, now = Date.now()) {
  const encoded = new URLSearchParams(fragment.replace(/^#/, '')).get('call');
  if (!encoded || encoded.length > 12000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new Error('Open the complete invitation link sent by GeorgeTech.');
  }
  let data;
  try {
    const bytes = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
    data = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  } catch { throw new Error('This invitation could not be read. Please check that the complete link was copied.'); }
  let room;
  try { room = new URL(data.room); } catch { throw new Error('This invitation has an invalid call address.'); }
  if (room.protocol !== 'https:' || room.hostname !== DAILY_HOST || room.port || room.username || room.password ||
      !/^\/gt-[a-f0-9]{32}$/.test(room.pathname) || room.search || room.hash) {
    throw new Error('This invitation is not for a GeorgeTech video room.');
  }
  if (typeof data.token !== 'string' || data.token.length < 16 || data.token.length > 8000 || /\s/.test(data.token)) {
    throw new Error('This invitation is missing its call access token. Please request a new invitation.');
  }
  if (!Number.isSafeInteger(data.expiresAt) || data.expiresAt * 1000 <= now) {
    throw new Error('This invitation has expired. Ask GeorgeTech for a new link.');
  }
  return {room: room.href, token: data.token, expiresAt: data.expiresAt,
    name: typeof data.name === 'string' ? data.name.slice(0, 80) : 'Guest',
    host: typeof data.host === 'string' ? data.host.slice(0, 80) : 'GeorgeTech'};
}

export function invitationFragment(value, currentUrl) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Paste the complete invitation link sent by GeorgeTech.'); }
  const current = new URL(currentUrl);
  const oldGuest = url.origin === 'https://georgetech-guest-calls.stephanvgeorge.chatgpt.site' && url.pathname === '/';
  const ownPage = url.origin === current.origin && url.pathname === current.pathname;
  const publicPage = url.origin === 'https://georgetech.uk' && url.pathname === '/call.html';
  if ((!oldGuest && !ownPage && !publicPage) || url.username || url.password || url.search) {
    throw new Error('Use a GeorgeTech invitation link, rather than a meeting or website address.');
  }
  parseVideoInvitation(url.hash);
  return url.hash;
}

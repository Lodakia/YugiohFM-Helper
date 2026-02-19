import { reactive } from 'vue';
import Cookies from 'js-cookie'

const defaultUserdata = {};

export const userdata = reactive({
    data: null
});

function getBaseUrl() {
    if (typeof window !== 'undefined' && window.siteUrl != null)
        return window.siteUrl.replace(/\/$/, '');
    return '';
}

/** Load userdata from server (decks, game state). Returns a Promise that resolves to the data object or null on failure. */
export function loadUserdataFromServer() {
    const base = getBaseUrl();
    if (!base) return Promise.resolve(null);
    return fetch(base + '/api/userdata', { method: 'GET' })
        .then(res => res.ok ? res.json() : null)
        .catch(() => null);
}

/** Save current userdata to server. Fire-and-forget; use for persistence alongside cookies. */
export function saveUserdataToServer() {
    const base = getBaseUrl();
    if (!base || userdata.data == null) return;
    fetch(base + '/api/userdata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userdata.data)
    }).catch(() => {});
}

export function SaveUserdata(cookie_name)
{
    Cookies.set(cookie_name, btoa(JSON.stringify(userdata.data)), { expires: 90, sameSite: 'strict' });
    saveUserdataToServer();
}

export function LoadUserdata(cookie_name)
{
    let rawUserData = Cookies.get('userdata');

    if (rawUserData != undefined) {
      try {
        userdata.data = JSON.parse(atob(rawUserData));
      } catch(e) {
        userdata.data = defaultUserdata;
      }
    }
    else {
      userdata.data = defaultUserdata;
    }
}

declare global {
  interface Window {
    umami: {
      track: (event: string | ((props: any) => any)) => void;
    };
  }
}

function possible_offline_track(arg: string | ((props: any) => any)) {
  if (navigator.onLine && window.umami) {
    window.umami.track(arg)
  }
}

export default function trackView() {
  let userUuid = getOrSetUUID()
  let birds_enabled = new URLSearchParams(window.location.search).has("birds");
  const payload =  {type: birds_enabled ? "birds" : "plants"}

  possible_offline_track((props: any) => ({ ...props, id: userUuid, data:payload }));

  let hidden_start: number | null = null;

  const visibiltyListener = () => {
    if (document.visibilityState === "hidden") {
      hidden_start = Date.now()
    } else if (document.visibilityState === "visible") {

      if (hidden_start !== null) {

        const hidden_ms = Date.now() - hidden_start

        if ((hidden_ms / (1000 * 60)) > 20 ) {
          // It has been long enough to count as a new page visit
          possible_offline_track((props: any) => ({ ...props, id: userUuid, data:payload }));
        }

        hidden_start = null;
      }
    }
  }

  document.addEventListener("visibilitychange", visibiltyListener);

  return () => { document.removeEventListener("visibilitychange", visibiltyListener) };
}

export function trackCardView() {
  let userUuid = getOrSetUUID()
  let birds_enabled = new URLSearchParams(window.location.search).has("birds");
  const payload =  {type: birds_enabled ? "birds" : "plants"}

  possible_offline_track((props: any) => ({...props, id: userUuid , name:"viewed card", data: payload}));
}

function getOrSetUUID() {
    let userUuid = localStorage.getItem('uuid');

    if (!userUuid) {
      userUuid = generateUUID();
      localStorage.setItem('uuid', userUuid);
    } 

    return userUuid;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
          v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}
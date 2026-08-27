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

function currentDeckPayload() {
  let birds_enabled = new URLSearchParams(window.location.search).has("birds");
  return {type: birds_enabled ? "birds" : "plants"}
}

export default function trackView() {
  if (localStorage.getItem('analyticsConsent') === 'false') return;
  const payload = currentDeckPayload();

  if (localStorage.getItem('analyticsConsent') !== 'false') {
    possible_offline_track((props: any) => ({ ...props, data: payload }));
  }

  let hidden_start: number | null = null;

  const visibiltyListener = () => {
    if (document.visibilityState === "hidden") {
      hidden_start = Date.now()
    } else if (document.visibilityState === "visible") {

      if (hidden_start !== null) {

        const hidden_ms = Date.now() - hidden_start

        if ((hidden_ms / (1000 * 60)) > 20 ) {
          // It has been long enough to count as a new page visit
          if (localStorage.getItem('analyticsConsent') !== 'false') {
            possible_offline_track((props: any) => ({ ...props, data: payload }));
          }
        }

        hidden_start = null;
      }
    }
  }

  document.addEventListener("visibilitychange", visibiltyListener);

  return () => { document.removeEventListener("visibilitychange", visibiltyListener) };
}

export function trackCardView() {
  if (localStorage.getItem('analyticsConsent') === 'false') return;
  const payload = currentDeckPayload();

  possible_offline_track((props: any) => ({...props, name:"viewed card", data: payload}));
}

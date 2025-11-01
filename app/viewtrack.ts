export default function trackView() {
    let userUuid = getOrSetUUID()

    umami.identify(userUuid);
    umami.track();

    let hidden_start: number | null = null;

    const visibiltyListener = () => {
      if (document.visibilityState === "hidden") {
        hidden_start = Date.now()
      } else if (document.visibilityState === "visible") {

        if (hidden_start !== null) {

          const hidden_ms = Date.now() - hidden_start

          if ((hidden_ms / (1000 *30)) > 20 ) {
            // It hase been long enought to count as a new page visit
            umami.track();
          }

          hidden_start = null;
        }
      }
    }

    document.addEventListener("visibilitychange", visibiltyListener);

    return () => { document.removeEventListener("visibilitychange", visibiltyListener) };
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
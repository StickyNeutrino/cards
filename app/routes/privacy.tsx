import type { Route } from "./+types/privacy";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Privacy Policy - Flash Cards" },
    {
      name: "description",
      content:
        "How the Flash Cards app handles analytics, crash reports, and your data.",
    },
  ];
}

export default function Privacy() {
  return (
    <main className="min-h-screen flex justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl p-6 sm:p-10 text-gray-800 h-fit">
        <a href="/" className="text-sm underline text-gray-600 hover:text-black">
          &larr; Back to Flash Cards
        </a>
        <h1 className="text-3xl font-bold mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-6">
          Last updated: August 27, 2026
        </p>

        <div className="space-y-6 text-sm leading-6">
          <section>
            <h2 className="text-lg font-semibold mb-2">Overview</h2>
            <p>
              Flash Cards is a study app for San Diego Canyonlands native
              species. It requires no account, and you never need to give us
              any personal information. This policy explains the small amount
              of data the app collects, why we collect it, and how you can
              turn data collection off.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Analytics</h2>
            <p>
              We use Umami Cloud (umami.is), a privacy-friendly, cookieless
              analytics service, to understand in aggregate how the app is
              used. Events include page views and actions such as viewing a
              card, along with the deck being studied (plants or birds). No
              cookies are set, no cross-site tracking occurs, and no unique or
              persistent identifier is stored on your device or sent to the
              service. Umami may infer coarse information such as country,
              browser, operating system, and device type from your request.
              You can read more about Umami at{" "}
              <a
                href="https://umami.is"
                className="underline"
                rel="noopener noreferrer"
              >
                umami.is
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Crash reports</h2>
            <p>
              When the app hits an unexpected error, it can send a crash
              report to our error collection service at
              errors.cards.unimpossy.com. A report contains the error message,
              stack trace, the page URL, your browser's user-agent string, a
              timestamp, and your IP address (which the server receives with
              any web request). Crash reports are used only to find and fix
              bugs, and are never shared with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">
              Data stored on your device
            </h2>
            <p>
              The app uses your browser's local storage to remember your
              preferences (deck mode, card flip speed), your analytics and
              crash reporting choices, and to cache card images for offline
              use. This data stays on your device. The app does not use
              advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Server logs</h2>
            <p>
              Our hosting provider may temporarily process standard request
              metadata, such as IP addresses, for security and operational
              purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Your choices</h2>
            <p>
              Analytics and crash reporting are enabled by default so we can
              improve the app for everyone, but you can disable either at any
              time: open the menu, choose Settings, and use the toggles under
              Privacy Preferences. You can also use the Opt out button on the
              privacy notice shown on your first visit. Turning a setting off
              stops that data collection immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">What we never do</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>We never sell or rent your data.</li>
              <li>We never share your data with advertisers.</li>
              <li>
                We never build advertising profiles or use fingerprinting.
              </li>
              <li>We never send marketing messages.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Data retention</h2>
            <p>
              Crash reports are kept only as long as needed to diagnose and
              fix problems. Analytics data is retained according to Umami
              Cloud's standard retention practices.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Changes to this policy</h2>
            <p>
              If we change this policy, we will post the updated version on
              this page and update the date above.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Contact</h2>
            <p>
              Questions, requests, or concerns about your data? Email us at{" "}
              <a href="mailto:contact@unimpossy.com" className="underline">
                contact@unimpossy.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

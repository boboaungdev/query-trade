import { APP_NAME, SITE_URL } from "../constants/index.js";

const apiAppName = `${APP_NAME} API`;

export const rootHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${apiAppName}</title>
    <link rel="icon" type="image/svg+xml" href="/query-trade.svg" />
    <style>
      :root {
        color-scheme: dark;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: "Geist Variable", "Segoe UI", sans-serif;
        background: radial-gradient(circle at top, #123041 0%, #07141a 55%, #03080b 100%);
        color: #e6fbff;
      }

      main {
        width: min(1100px, 100%);
        padding: 32px;
        border: 1px solid rgba(125, 211, 252, 0.2);
        border-radius: 24px;
        background: rgba(5, 19, 24, 0.82);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        text-align: center;
      }

      .hero {
        display: grid;
        gap: 18px;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
        padding: 6px 12px;
        border: 1px solid rgba(103, 232, 249, 0.22);
        border-radius: 999px;
        background: rgba(8, 27, 34, 0.8);
        color: #8be9ff;
        font-size: 0.76rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #34d399;
        box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.18), 0 0 18px rgba(52, 211, 153, 0.45);
        flex: 0 0 auto;
      }

      .logo {
        width: 112px;
        height: 112px;
        display: block;
        margin: 0 auto 22px;
        filter: drop-shadow(0 14px 36px rgba(66, 216, 255, 0.24));
      }

      h1 {
        margin: 0 0 8px;
        font-size: clamp(2rem, 4vw, 2.6rem);
      }

      .subtitle {
        margin: 0 auto 18px;
        max-width: 42ch;
        color: #d3f7ff;
        font-size: 1.02rem;
        line-height: 1.7;
      }

      p {
        margin: 0 auto;
        max-width: 46ch;
        color: #bae6fd;
        line-height: 1.6;
      }

      .section {
        margin-top: 28px;
        text-align: left;
      }

      .section-title {
        margin: 0 0 12px;
        color: #d9f8ff;
        font-size: 0.92rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .actions {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 22px;
        flex-wrap: wrap;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 156px;
        padding: 12px 18px;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 600;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      }

      .button:hover {
        transform: translateY(-1px);
      }

      .button-primary {
        background: linear-gradient(135deg, #42d8ff, #22d3ee);
        color: #06202a;
        box-shadow: 0 10px 30px rgba(66, 216, 255, 0.24);
      }

      .button-secondary {
        border: 1px solid rgba(125, 211, 252, 0.22);
        background: rgba(34, 211, 238, 0.08);
        color: #c8f5ff;
      }

      .grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      }

      .card {
        padding: 14px 15px;
        border: 1px solid rgba(125, 211, 252, 0.16);
        border-radius: 18px;
        background: rgba(10, 24, 31, 0.72);
      }

      .card strong {
        display: block;
        margin-bottom: 6px;
        color: #f0fdff;
        font-size: 0.98rem;
      }

      .card span {
        display: block;
        color: #9fdff0;
        font-size: 0.92rem;
        line-height: 1.5;
      }

      .endpoint-list {
        display: grid;
        gap: 10px;
      }

      .endpoint {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border: 1px solid rgba(125, 211, 252, 0.14);
        border-radius: 16px;
        background: rgba(9, 22, 28, 0.74);
      }

      .method {
        min-width: 56px;
        padding: 5px 8px;
        border-radius: 999px;
        background: rgba(52, 211, 153, 0.14);
        color: #86efac;
        font-size: 0.78rem;
        font-weight: 700;
        text-align: center;
        letter-spacing: 0.08em;
      }

      .endpoint code {
        margin-top: 0;
        padding: 0;
        border-radius: 0;
        background: transparent;
        color: #e6fbff;
        font-size: 0.94rem;
      }

      .endpoint small {
        color: #9fdff0;
      }

      code {
        display: inline-block;
        margin-top: 22px;
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(34, 211, 238, 0.12);
        color: #67e8f9;
      }

      @media (min-width: 960px) {
        main {
          padding: 44px;
          border-radius: 30px;
        }

        .hero {
          grid-template-columns: 160px minmax(0, 1fr);
          align-items: center;
          text-align: left;
        }

        .hero-media {
          display: flex;
          justify-content: center;
        }

        .hero-copy p,
        .hero-copy .subtitle {
          margin-left: 0;
        }

        .actions {
          justify-content: flex-start;
        }

        .logo {
          width: 136px;
          height: 136px;
          margin: 0;
        }
      }

      @media (min-width: 1200px) {
        main {
          padding: 52px;
        }

        .grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="hero-media">
          <img class="logo" src="/query-trade.svg" alt="${APP_NAME} logo" />
        </div>
        <div class="hero-copy">
          <span class="eyebrow"><span class="status-dot" aria-hidden="true"></span>API Status OK</span>
          <h1>${apiAppName}</h1>
          <p class="subtitle">
            Backtesting, execution workflows, and exchange-connected strategy
            tooling in one focused service layer.
          </p>
          <p>
            Trading backtesting and strategy testing API for running historical
            simulations and exchange-connected workflows.
          </p>
          <div class="actions">
            <a class="button button-primary" href="${SITE_URL || "/"}" target="_blank" rel="noreferrer">Open Client App</a>
            <a class="button button-secondary" href="/query-trade.svg" target="_blank" rel="noreferrer">Open Brand Asset</a>
          </div>
        </div>
      </section>
      <section class="section" aria-labelledby="route-groups-title">
        <h2 class="section-title" id="route-groups-title">Route Groups</h2>
        <div class="grid">
          <div class="card">
            <strong>/api/auth</strong>
            <span>Authentication, profile, password, refresh, and connected account flows.</span>
          </div>
          <div class="card">
            <strong>/api/backtest</strong>
            <span>Run historical simulations and manage backtest-related workflows.</span>
          </div>
          <div class="card">
            <strong>/api/strategy</strong>
            <span>Create and manage strategy definitions used by the trading engine.</span>
          </div>
          <div class="card">
            <strong>/api/indicator</strong>
            <span>Indicator endpoints for strategy inputs and technical analysis logic.</span>
          </div>
          <div class="card">
            <strong>/api/user</strong>
            <span>User-specific resources and account-related API features.</span>
          </div>
          <div class="card">
            <strong>/api/bookmark</strong>
            <span>Persist bookmarks or saved references across the client experience.</span>
          </div>
        </div>
      </section>
      <section class="section" aria-labelledby="quick-start-title">
        <h2 class="section-title" id="quick-start-title">Common Requests</h2>
        <div class="endpoint-list">
          <div class="endpoint">
            <span class="method">POST</span>
            <div>
              <code>/api/auth/signup</code>
              <small>Create a new account and begin the verification flow.</small>
            </div>
          </div>
          <div class="endpoint">
            <span class="method">POST</span>
            <div>
              <code>/api/auth/signin</code>
              <small>Authenticate and receive the session/auth payload.</small>
            </div>
          </div>
          <div class="endpoint">
            <span class="method">POST</span>
            <div>
              <code>/api/auth/refresh</code>
              <small>Refresh credentials using the cookie-backed refresh flow.</small>
            </div>
          </div>
        </div>
      </section>
      <code>Use the /api/* routes for requests</code>
    </main>
  </body>
</html>`;

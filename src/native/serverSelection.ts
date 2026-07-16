import { BrowserWindow, app } from "electron";

import { config } from "./config";
import { DEFAULT_BUILD_URL } from "./window";

const SELECTION_SCHEME = "stoat-server:";
const CURRENT_SELECTION_VERSION = 1;

function normaliseServerUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(candidate);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS addresses are supported.");
  }

  return url.toString();
}

function selectionPage() {
  const defaultUrl = DEFAULT_BUILD_URL.replaceAll("&", "&amp;").replaceAll(
    '"',
    "&quot;",
  );

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Stoat — выбор сервера</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #191919; color: #f5f5f5; }
      main { width: min(480px, calc(100vw - 48px)); }
      h1 { margin: 0 0 12px; font-size: 25px; }
      p { margin: 0 0 22px; color: #b8b8b8; line-height: 1.45; }
      label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
      input { width: 100%; padding: 12px 14px; border: 1px solid #444; border-radius: 8px; background: #242424; color: inherit; outline: none; }
      input:focus { border-color: #7c6af2; box-shadow: 0 0 0 3px #7c6af233; }
      small { display: block; min-height: 38px; padding-top: 8px; color: #999; }
      small.error { color: #ff7777; }
      button { width: 100%; padding: 12px; border: 0; border-radius: 8px; background: #6c5ce7; color: white; font-weight: 700; cursor: pointer; }
      button:hover { background: #796bea; }
    </style>
  </head>
  <body>
    <main>
      <h1>Выбор сервера / Select server</h1>
      <p>Укажите адрес веб-клиента вашего сервера. Оставьте поле пустым, чтобы использовать официальный сервер Stoat.</p>
      <form>
        <label for="server">Адрес веб-клиента / Web client URL</label>
        <input id="server" type="text" inputmode="url" autocomplete="url" placeholder="${defaultUrl}" autofocus>
        <small id="hint">По умолчанию: ${defaultUrl}</small>
        <button type="submit">Продолжить / Continue</button>
      </form>
    </main>
    <script>
      const form = document.querySelector("form");
      const input = document.querySelector("input");
      const hint = document.querySelector("small");
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        hint.classList.remove("error");
        location.href = "stoat-server://select?url=" + encodeURIComponent(input.value);
      });
      window.showServerError = (message) => {
        hint.textContent = message;
        hint.classList.add("error");
        input.focus();
      };
    </script>
  </body>
</html>`;
}

/** Ask for a web client address once, while retaining --force-server for dev. */
export async function selectServerOnFirstLaunch() {
  if (
    config.serverSelectionVersion >= CURRENT_SELECTION_VERSION ||
    app.commandLine.hasSwitch("force-server")
  )
    return true;

  return new Promise<boolean>((resolve) => {
    const selector = new BrowserWindow({
      width: 560,
      height: 430,
      minWidth: 420,
      minHeight: 360,
      resizable: true,
      backgroundColor: "#191919",
      title: "Stoat — выбор сервера",
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    let completed = false;
    const finish = (serverUrl: string) => {
      if (completed) return;
      completed = true;
      config.serverUrl = serverUrl;
      config.serverSelectionShown = true;
      config.serverSelectionVersion = CURRENT_SELECTION_VERSION;
      selector.destroy();
      resolve(true);
    };

    selector.on("closed", () => {
      if (!completed) {
        // Closing the chooser is not a selection. Do not silently continue to
        // the default login page; ask again on the next launch instead.
        completed = true;
        resolve(false);
        app.quit();
      }
    });
    selector.webContents.on("will-navigate", (event, navigationUrl) => {
      if (!navigationUrl.startsWith(SELECTION_SCHEME)) return;

      event.preventDefault();
      try {
        const value = new URL(navigationUrl).searchParams.get("url") ?? "";
        finish(normaliseServerUrl(value));
      } catch {
        selector.webContents.executeJavaScript(
          'window.showServerError("Введите корректный HTTP(S)-адрес / Enter a valid HTTP(S) URL")',
        );
      }
    });

    selector.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(selectionPage())}`,
    );
  });
}

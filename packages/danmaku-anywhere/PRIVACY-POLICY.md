# Privacy Policy

Danmaku Anywhere works without an account. Most of its data, including your settings, sources and downloaded danmaku, stays in your browser. This policy describes what leaves your device and why.

## Data sent to provide the extension's features

To find and load danmaku, the extension sends requests to the danmaku sources you have enabled, such as DanDanPlay, Bilibili and Tencent Video. Some of these requests go through our backend service. They contain the search terms you enter, or the title and episode the extension detects on the page you are watching.

When you use the AI title recognition feature, the title of the page you are watching is sent to our backend. The backend passes it to Google's Gemini service to identify the show and episode. If you configure your own OpenAI-compatible AI provider instead, the title is sent to the provider you configured, not to us.

We do not use this data for any other purpose.

## Accounts and cloud backup

Accounts are optional. They are only needed for cloud backup.

- **Account information:** if you create an account, we store your email address and a hashed password. If you sign in with Google, we receive your name, email address and profile picture from Google. We use your email address to verify your account and to send password reset emails.
- **Cloud backup:** when you upload a backup, we store a copy of your extension settings on our backend so you can restore them later. A backup contains your settings, danmaku sources, mount configurations, matching rules and AI provider settings, including any API key you entered for your own AI provider. It does not contain your downloaded danmaku, your search history or your sign-in session.

You can delete your account from the extension's settings. Deleting your account also deletes all of your cloud backups.

## Usage analytics

We collect non-personally identifiable information to analyze and improve the extension. The data collection is handled differently for the extension's popup interface and the content script that runs on web pages.

### 1. General Extension Usage

This data is collected from your interactions with the extension's main user interface (the popup window).

- Interaction Data: We record anonymous events like clicks, scrolls, and interactions with UI elements (e.g., buttons, menus, sliders). This helps us understand which features are popular and how users navigate the extension.
- Content Data: We collect information about the structure of the extension's popup window to identify and fix UI/UX issues.

### 2. On-Page Usage (Content Script)

When the extension is active on a web page (e.g., when the + button is visible), a content script runs to provide its functionality. This script also collects anonymous telemetry.

- Page visit data: We collect URL of the page visited and the time spent on the page.
- Interaction Data: We record your interactions with the UI elements added by our extension on the page. We also collect general interaction data like clicks and scrolls on the page to understand how the extension's presence affect your experience.
- Anonymized Page Content Data: We record changes to the page's structure (the Document Object Model or DOM). In this process, all text, images, user-entered content, and other media on the page are redacted or replaced with placeholders.

### Opting out

You can disable usage analytics by turning off the "Enable Analytics" option in the extension's settings. This stops the collection of all anonymous usage data.

## Service logs

Our backend keeps a small sample of request logs and records errors so we can keep the service running and fix problems. These logs can include the request path, your IP address and your browser's user agent. They are kept for a limited time and are not used to identify you.

## How we use your data

- To provide the extension's features, including danmaku search, title recognition and cloud backup
- To analyze feature usage and popularity
- To identify and resolve bugs and user experience issues

## Data sharing and third-party services

We do not sell, rent, or trade your data with any outside parties for marketing or other purposes.

We use these third-party services to run the extension and its backend:

- **Cloudflare** hosts our backend service, its database and its logs.
- **Google Gemini** identifies shows from page titles when you use AI title recognition.
- **Google** handles sign-in if you choose to sign in with Google.
- **Sentry** receives error reports from our backend.
- **Microsoft Clarity** analyzes the anonymous usage data described above. All data sent to Clarity is subject to the redaction rules described above to protect your privacy.

## Contact Us

If you have any questions or concerns about this privacy policy or our data practices, please open an issue in this repository.

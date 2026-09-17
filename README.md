# តម្លៃមាសស្វ័យប្រវត្តិ · Automatic daily gold poster

Every day at **9:00 AM Cambodia time**, this gets the gold price, draws your
poster, and posts it to your Telegram channel. Your phone can be off.

---

## Set up once

### 1. Make the Telegram bot

- In Telegram open **@BotFather** → send `/newbot` → give it a name
- It replies with a token like `123456:ABC-DEF...` — keep it
- Add the bot to your channel **as an administrator** (it will not work otherwise)

### 2. Get a gold price key

Sign up free at **goldapi.io** and copy your key.
(Or use any price service — see `PRICE_URL` below.)

### 3. Put the files on GitHub

- Make a free account at **github.com**
- Click **New repository** → name it `gold-poster` → **Private** → Create
- Upload all of these, keeping the folders:

```
.github/workflows/daily.yml
scripts/post.js
poster.html
package.json
last.json
README.md
```

### 4. Paste in your secrets

In the repository: **Settings → Secrets and variables → Actions → New repository secret**

| Name | What to put | Required |
|---|---|---|
| `TG_TOKEN` | the token from BotFather | yes |
| `TG_CHANNEL` | `@yourchannel` | yes |
| `GOLDAPI_KEY` | your goldapi.io key | yes* |
| `TG_ALERT` | your own Telegram id, for warnings | no |
| `MARKUP` | dollars to add to spot, e.g. `15` | no |
| `PRICE_URL` | a different price source instead of goldapi | no* |

\* you need either `GOLDAPI_KEY` or `PRICE_URL`.

### 5. Test it now

**Actions** tab → **Daily gold poster** → **Run workflow**.
It should post to your channel within a minute or two. After that it runs
itself every morning.

---

## Things worth knowing

**The time is UTC.** `cron: '0 2 * * *'` in `daily.yml` means 02:00 UTC,
which is 09:00 in Cambodia. To change to 8:00 AM, use `'0 1 * * *'`.

**GitHub's schedule is not exact.** It usually fires within a few minutes of
the hour, sometimes later when GitHub is busy. It will not be late by hours.

**The safety rule.** If today's price is more than **10%** away from
yesterday's, it does **not** post. It messages you instead. This stops a bad
number from reaching your customers. Change `MAX_JUMP` in `scripts/post.js`
if you want it stricter or looser.

**If something breaks**, the bot sends you the error message rather than
failing silently.

**`last.json`** is how it remembers yesterday's price. The workflow updates it
automatically — leave it alone.

**Changing the design.** `poster.html` is the same tool you use by hand. Replace
it with a newer version any time; the robot uses whatever is in the file.

# 🐕 Morning Dog Walk

A small household app for tracking whose turn it is to take the dog out in the
morning.

## How it works

- Add everyone in the household to the rota.
- Each morning the app shows who's up. Tap **✓ Walked** when it's done.
- If someone else covered, log it with **Someone else walked** — the original
  assignee is still up next time, so covering doesn't cost you your turn.
- If nobody walked the dog, mark it **Skipped** — the rotation doesn't advance,
  so the same person owes the next morning.
- Walk counts and recent history keep everyone honest.

Data is stored in the browser's `localStorage`, so it lives on the device
(typically the tablet or phone by the front door).

## Running it

No dependencies — just Node.js 18+.

```sh
npm start        # serves the app at http://localhost:3000
npm test         # runs the rota logic tests (node --test)
```

## Project layout

```
src/rota.js        Pure rotation logic (shared by the app and the tests)
public/            Frontend: index.html, app.js, style.css
server.js          Zero-dependency static server for local use
test/rota.test.js  Unit tests for the rotation rules
```

## Ideas for later

- Shared backend (or sync via a small JSON API) so the whole household sees
  the same state across devices
- Evening walks / multiple walks per day
- Weekday-only schedules or per-person availability
- Push reminder if the morning walk isn't logged by a set time

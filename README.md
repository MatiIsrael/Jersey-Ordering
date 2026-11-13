# 🎉 University Half-Life Celebration — Registration System

A complete, production-ready registration website with a clean step-by-step form, real **Firebase** backend (Firestore database + Firebase Auth + Firebase Storage), payment screenshot upload, a protected real-time admin dashboard, and an animated jersey reveal on success.

**Stack:** React 18 + Vite · Tailwind CSS v4 · Firebase (Firestore + Auth + Storage)

---

## ✅ What's included

| Feature | Where |
| --- | --- |
| Single-page registration form — payment table, then Full Name → Jersey + Size → Upload → Submit | `src/components/RegistrationForm.jsx` |
| Payment table: **999 Birr**, account name **MATI ISRAEL**, Telebirr & CBE numbers | same file (data in `src/config.js` / `.env`) |
| T-shirt size select — horizontal pills: S / M / L / XL / XXL | same file |
| Payment screenshot upload (JPG/JPEG/PNG, preview, change/remove) → Firebase Storage | same file |
| Real database saving (Firestore `registrations` collection) + unique Registration ID | `src/lib/firebase.js`, `src/lib/ids.js` |
| Success screen with 2D motion jersey — the student's printed name & number on the T-shirt back | `src/components/JerseyCard.jsx` |
| Protected admin dashboard at `/#/admin` — real-time updates, search, filters, status, delete, screenshot viewer | `src/pages/Admin.jsx` |
| Firebase security rules (Firestore + Storage) | `firebase/firestore.rules`, `firebase/storage.rules` |

Security model: the Firebase web config in `.env` is safe to expose — real security is enforced by the **security rules** (public can only *create* validated registrations; only signed-in admins can read/update/delete). The admin password lives only in Firebase Authentication (hashed server-side) — it is never in the frontend code or `.env`.

---

## 🛠 Step-by-step setup

### 1. Create the Firebase project + web app

1. Go to <https://console.firebase.google.com> → **Add project** (name it e.g. `halflife-registration`; Google Analytics optional).
2. In the project overview, click the **Web** icon `</>` to add a Web app → register it (nickname only, no hosting needed yet).
3. Firebase shows a `firebaseConfig` object. Copy these six values into your `.env` file:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com  (or your-project.firebasestorage.app)
VITE_FIREBASE_MSG_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

4. Restart the dev server after changing `.env`.

### 2. Create the Firestore database

1. Console → **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** (our rules take over anyway), pick a region close to you (e.g. `europe-west` / `asia-southeast1`), Enable.
3. No manual collections needed — the first registration creates the `registrations` collection automatically.

### 3. Publish the Firestore security rules

1. Console → **Firestore Database → Rules** tab.
2. Open `firebase/firestore.rules` in this project, copy **the whole file**, paste it into the editor, press **Publish**.

### 4. Create Firebase Storage (for payment screenshots)

> ⚠️ Note: for **new** Firebase projects, Cloud Storage requires the **Blaze (pay-as-you-go) plan** — you add a billing card but the free tier still applies for small usage (5 GB storage, 1 GB/day download). If you don't want to enable Blaze, contact me and I can switch the screenshot storage to a different approach.

1. Console → **Build → Storage → Get started** → set the same region → Done.
2. Console → **Storage → Rules** tab.
3. Open `firebase/storage.rules` in this project, copy **the whole file**, paste it, press **Publish**.

### 5. Configure admin authentication

1. Console → **Build → Authentication → Get started**.
2. **Sign-in method** tab → enable **Email/Password**.
3. **Users** tab → **Add user**:
   - Email: `samiraga@gmail.com`
   - Password: enter the admin password there (Firebase stores it hashed — it never touches the code).
4. Anyone signed in through Firebase Auth is treated as an admin by the dashboard; no one else can even read the data.

### 6. RLS / rules — done in steps 3 & 4

Anonymous visitors can only **create** validated registrations; reading, updating and deleting requires an authenticated admin session. Never loosen the rules.

### 7. Payment numbers

Already set in `.env` / `src/config.js`:

- Telebirr: `0943652102`
- CBE: `1000656159905`
- Account name: `MATI ISRAEL`

### 8. Run the project

```bash
npm install
npm run dev
```

Open `http://localhost:5173` (or the port Vite prints).

### 9. Test the complete flow

1. Open the site → payment table shows 999 Birr / MATI ISRAEL / both numbers.
2. Submit empty → inline errors: "Full name is required.", "Please enter a jersey number from 0–99.", "Please select a T-shirt size.", "Please upload your payment screenshot." — no page reload.
3. Fill name (auto-capitalizes), jersey 0–99 (digits only), pick a size pill (single select), upload a JPG/PNG.
4. Tick *"I don't want my name and jersey number printed…"* → jersey becomes optional; the success jersey shows plain "NO PRINT".
5. **Submit** → button locks (no double submit), screenshot uploads to Storage, document saved in Firestore, success screen shows the animated jersey with the printed name + number and your Registration ID.
6. Go to `/#/admin` → sign in with `samiraga@gmail.com` + your admin password.
7. The registration appears **live** (real-time, no refresh needed) — search by name/ID, filter by payment method & status, change status to Verified/Rejected, view/download the screenshot, or delete it.
8. Confirm in Firebase Console → Firestore Database (documents) and Storage (files) that data really exists.

### 10. Deploy

```bash
npm run build   # outputs static site to /dist
```

Deploy `dist/` to any static host (Vercel / Netlify / Cloudflare Pages / Firebase Hosting) and add the same environment variables in the host dashboard. The app uses hash routing, so `/#/admin` works everywhere with no rewrite rules.

In Firebase Console → **Authentication → Settings → Authorized domains**, add your production domain so admin sign-in works there.

---

## 📁 Project structure

```
├── index.html
├── package.json
├── vite.config.js
├── .env                  ← your Firebase config (git-ignored)
├── .env.example          ← template to copy
├── firebase/
│   ├── firestore.rules   ← paste into Firestore → Rules
│   └── storage.rules     ← paste into Storage → Rules
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx           ← routes: / and /admin (hash router)
    ├── index.css         ← Tailwind v4 design system
    ├── config.js         ← event info + payment numbers
    ├── lib/
    │   ├── firebase.js   ← Firebase init: auth, Firestore, Storage helpers
    │   └── ids.js        ← unique Registration ID generator (HL-…)
    ├── components/
    │   ├── JerseyCard.jsx        ← 2D motion jersey on the success screen
    │   └── RegistrationForm.jsx  ← validation, upload, submit
    └── pages/
        ├── Home.jsx      ← landing page
        └── Admin.jsx     ← protected real-time dashboard
```

## 🔒 Security checklist

- ✅ Only the public web config in the browser; **no admin password or secret keys in code**.
- ✅ Admin password lives in Firebase Auth (hashed server-side), not in `.env` or source.
- ✅ Firestore rules: anonymous users can only **create** strictly-validated registrations; read/update/delete = admin only.
- ✅ Storage rules: upload limited to JPG/PNG under 5 MB; delete/update = admin only.
- ✅ `.env` is git-ignored; `.env.example` documents every variable.
- ✅ Double-submission prevented (submit lock + disabled button).

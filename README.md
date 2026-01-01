This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, install dependencies and run the development server and emulators:

```bash
npm install
cd functions && npm install && cd ..

# start Firebase emulators (Firestore, Functions)
npm run emulate

# in another terminal start Next dev server
npm run dev
```

**Notes:**

- Firestore composite index required for scheduled sorteio query: see `firestore.indexes.json`. Deploy indexes with the Firebase CLI or create in console.
- For local dev: copy `.env.local.example` to `.env.local` and fill the keys. The repo includes a sample service account file for convenience (do not commit your real keys).
- Payment provider: By default the project uses `PAYMENT_PROVIDER=simulated` (no Stripe). To enable Stripe, set `PAYMENT_PROVIDER=stripe` and provide `STRIPE_SECRET_KEY`/webhook secret.
- Run E2E tests with `npx playwright test` (ensure `npm run dev` + `npm run emulate` are running).

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the pages under `src/app` and API routes under `src/app/api`. The page auto-updates as you edit the file.

## Executar testes E2E (Playwright)
1. Defina `ADMIN_SECRET` no ambiente (localmente ou no CI), e garanta `npm run dev` + `npm run emulate` rodando.
2. Rode:
```bash
npx playwright test
# ou
npm run test:e2e
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).

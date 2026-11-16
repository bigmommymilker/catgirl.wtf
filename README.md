This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

Use Node.js 22 or newer, preferably a supported LTS release. Node.js 26 LTS
was used to verify this project. Install dependencies with
`npm ci` before running the commands below.

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## CAD viewer

Add a `cadModel` object to a project in `portfolio.js` to enable its CAD Model tab:

```js
cadModel: {
  name: 'Sample mounting bracket',
  modelType: 'bracket',
  description: 'A mounting bracket with perpendicular plates, seven holes and two ribs.',
  color: '#aab8b6',
  dimensions: { width: 100, height: 65, depth: 60 },
}
```

The current viewer generates a sample bracket. It does not import STEP,
SolidWorks, STL, or other CAD files. Optional dimensions are nominal millimeters;
finite values from 1 to 10,000 are supported, with defaults for invalid values.
The example's material, mass and manufacturing status are sample text, not
calculated engineering results. Unsupported model types show an explanatory
message. The viewer loads when its tab opens and releases graphics resources
when the tab or project closes.

Use the labeled buttons to rotate, pan, zoom, change display mode, or select a
camera preset. While the viewport is focused, arrow keys rotate, Shift + arrows
pan, +/− zoom, R resets, and A toggles auto-rotation. A visible model description
remains available when WebGL cannot start; Retry recreates the viewer after a
graphics context failure.

## Accessibility and verification

Accessibility work targets WCAG 2.2 AA: native modal isolation and focus return,
keyboard tabs and CAD controls, text alternatives, page language, skip navigation,
contrast in both themes, reflow, pausable decorative motion and reduced-motion
support. This is not an ADA certification. A manual assistive-technology review
with NVDA/VoiceOver, browser zoom and supported device/browser combinations is
still needed before claiming full conformance.

```bash
npm run lint
npm run build
npx playwright install chromium
npm test
```

The Playwright suite starts and stops a production server on port 3100. It checks
keyboard and modal behavior, actual WebGL pixel changes, display modes and camera
controls, context-loss recovery, disabled-WebGL fallback, narrow layouts, themes,
and reduced motion. Axe scans cover the homepage, project notes, CAD viewer and
fallback against its WCAG A/AA rules. Automated scans cannot prove full WCAG
conformance.

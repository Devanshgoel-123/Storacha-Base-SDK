const ROOT_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 *
 * @see {@link https://docs.base.org/mini-apps/features/manifest}
 */
export const minikitConfig = 
{
  accountAssociation: {
    "header": "eyJmaWQiOjExMzI2MTMsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyMWYyNzg5QTcwMUJERDNlQjZBQjFlNzc0YWMzZTE3MjcyN0IwNGJDIn0",
    "payload": "eyJkb21haW4iOiJmbG93c2VuZC1taW5pLWFwcC1hbHBoYS52ZXJjZWwuYXBwIn0",
    "signature": "aN+c2WfnYMFRigDy5j+LK1hPs4bRwfv5U/UQm+ld739TU6illoUop6NqcStW/R4+AgeHUReHGNInFYbbmYF5Nxw="
  },
baseBuilder: {
  allowedAddresses: ["0x357D015b64Ba0A9A4bF02f4C6352712cd5feF3Da"],
},
miniapp: {
  version: "1",
  name: "flowsend",
  subtitle: "GGasless Global Payments",
  description:
  "FlowSend enables instant zero-gas-fee global money transfers using USDC on Base blockchain with seamless bank on-off ramps powered by Circle API.",  screenshotUrls: [
    `${ROOT_URL}/flowsendLogo.png`,
    `${ROOT_URL}/deposit.png`,
    `${ROOT_URL}/withdraw.png`,
    `${ROOT_URL}/transfer.png`,
    `${ROOT_URL}/dashboard.png`,
  ],
  iconUrl: `${ROOT_URL}/flowsendLogo.png`,
  splashImageUrl: `${ROOT_URL}/flowsendLogo.png`,
  splashBackgroundColor: "#000000",
  homeUrl: ROOT_URL,
  webhookUrl: `${ROOT_URL}/api/webhook`,
  primaryCategory: "utility",
  tags: ["payment", "finance", "cross-border", "crypto", "usdc"],
  heroImageUrl: `${ROOT_URL}/flowsendLogo.png`,
  tagline: "Global zero-gas payments",
  ogTitle: "FlowSend - Gasless Payments",
  ogDescription: "FlowSend uses Base blockchain and Circle APIs for fast, affordable global transfers.",
  ogImageUrl: `${ROOT_URL}/flowsendLogo.png`,
},
} as const;

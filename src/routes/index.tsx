import { createFileRoute } from "@tanstack/react-router";

import { Prototype } from "@/components/humnazar/Prototype";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Humnazar prototype: voice-first visual help" },
      { name: "description", content: "Clickable Humnazar prototype for usability testing: blind and low-vision users get help from volunteers on a video call." },
      { property: "og:title", content: "Humnazar prototype: voice-first visual help" },
      { property: "og:description", content: "Clickable Humnazar prototype for usability testing, in English and Urdu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Prototype />;
}

"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Does Human Assist need Claude Code running?",
    answer:
      "Yes. Human Assist is designed to pair with Claude Code. When Claude Code needs something from you, it pushes a surface to Human Assist through the MCP protocol.",
  },
  {
    question: "What happens when I close the window?",
    answer:
      "Human Assist stays running in the background. Surfaces you missed will appear when you open it again. Nothing is lost.",
  },
  {
    question: "Is this only for macOS?",
    answer:
      "Currently yes. It's built on Electrobun with macOS-native window chrome. We'd love to port it to other platforms if there's demand.",
  },
  {
    question: "Can I customize the surfaces?",
    answer:
      "Surface types are defined by Claude's MCP protocol. You choose what Claude asks for — canvas, forms, browser views — but the structure is shared.",
  },
];

export default function LandingFaq() {
  const [active, setActive] = useState<string | undefined>(undefined);

  return (
    <section className="py-20" id="faq">
      <div className="mx-auto max-w-2xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-medium" style={{ color: "#7c6fa8", letterSpacing: "0.5px" }}>
            FAQ
          </p>
          <h2 className="text-3xl font-bold" style={{ color: "#3d3d3d" }}>
            Common questions
          </h2>
        </div>

        <div className="w-full">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
              <button
                className="flex w-full items-center justify-between py-4 text-left text-base font-semibold"
                style={{ color: "#3d3d3d" }}
                onClick={() => setActive(active === `item-${i}` ? undefined : `item-${i}`)}
              >
                {faq.question}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${active === `item-${i}` ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-[max-height] ${
                  active === `item-${i}` ? "max-h-48" : "max-h-0"
                }`}
              >
                <p className="pb-4 text-sm" style={{ color: "#8a8178", lineHeight: 1.55 }}>
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

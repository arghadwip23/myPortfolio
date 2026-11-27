import {
  SiNextdotjs, SiReact, SiTailwindcss, SiGreensock, SiThreedotjs,
  SiKotlin, SiJetpackcompose, SiCplusplus, SiPython,
  SiPostgresql, SiMongodb, SiSupabase, SiNodedotjs,
} from "react-icons/si";

const STACK = [
  { name: "Next.js", Icon: SiNextdotjs },
  { name: "React", Icon: SiReact },
  { name: "Tailwind", Icon: SiTailwindcss },
  { name: "GSAP", Icon: SiGreensock },
  { name: "Three.js", Icon: SiThreedotjs },
  { name: "Kotlin", Icon: SiKotlin },
  { name: "Compose", Icon: SiJetpackcompose },
  { name: "C++", Icon: SiCplusplus },
  { name: "Python", Icon: SiPython },
  { name: "Node.js", Icon: SiNodedotjs },
  { name: "PostgreSQL", Icon: SiPostgresql },
  { name: "MongoDB", Icon: SiMongodb },
  { name: "Supabase", Icon: SiSupabase },
];

export default function TechMarquee() {
  return (
    <section
      aria-label="Tech stack"
      className="relative w-full border-y border-neutral-200 bg-white"
    >
      {/* border-x draws the vertical guides, so they continue from the hero */}
      <div className="md:mx-[var(--guide-x)] md:border-x md:border-neutral-200">
        <div
          className="marquee flex overflow-hidden py-6 md:py-8"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="marquee-track flex shrink-0 items-center gap-10 pr-10 md:gap-16 md:pr-16"
            >
              {STACK.map(({ name, Icon }) => (
                <li
                  key={`${copy}-${name}`}
                  className="flex shrink-0 items-center gap-2.5 font-rajdhani text-lg font-semibold uppercase tracking-wider text-neutral-400 transition-colors duration-300 hover:text-neutral-950 md:text-xl"
                >
                  <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  {name}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
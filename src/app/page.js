import Image from "next/image";
import Hero from "@/components/hero.jsx"
import TechMarquee from "@/components/TechMarquee";
import StorySection from "@/components/StorySection";
//import Navbar from "@/components/Navbar.jsx"

export default function Home() {
  return (
    
          <>
          
          <Hero/>
          <TechMarquee />
          <StorySection />

          <img src="https://2no.co/1Uv6X4.png"  className="hidden"/>
          </>
  );
}

import { useLocation } from "wouter";
import { Cpu, Zap, Brain, Globe, Code2, Sparkles, ArrowRight, Star } from "lucide-react";

const CAPABILITIES = [
  { icon: Brain, title: "Genius-Level IQ", desc: "Reasoning depth that rivals the world's top experts across every domain" },
  { icon: Code2, title: "Every Language", desc: "Python, Rust, Go, TypeScript, C++, Java, Swift — 50+ languages mastered" },
  { icon: Globe, title: "All Knowledge", desc: "Science, math, history, law, medicine, philosophy — no limits" },
  { icon: Zap, title: "Instant Streaming", desc: "Responses stream token-by-token in real time — zero waiting" },
];

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden text-center px-6">
      {/* Animated background */}
      <div className="nexus-bg"><div className="orb-3" /></div>
      <div className="nexus-grid" />

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-3xl mx-auto">

        {/* Logo mark */}
        <div className="relative">
          <div
            className="flex items-center justify-center w-24 h-24 rounded-3xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)",
              boxShadow: "0 0 60px rgba(124,58,237,0.6), 0 0 120px rgba(124,58,237,0.2)",
            }}
          >
            <Cpu className="w-12 h-12 text-white" />
          </div>
          <div
            className="absolute -top-1 -right-1 flex items-center justify-center w-7 h-7 rounded-full"
            style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", boxShadow: "0 0 12px rgba(6,182,212,0.8)" }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-3">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mx-auto"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            <Star className="w-3 h-3" style={{ color: "#a78bfa" }} />
            <span className="text-xs font-semibold" style={{ color: "#a78bfa" }}>Powered by GPT-5</span>
          </div>

          <h1
            className="text-6xl font-black tracking-tight leading-none"
            style={{ letterSpacing: "-0.03em" }}
          >
            <span className="gradient-text">Nexus AI</span>
          </h1>
          <p
            className="text-xl font-light max-w-lg mx-auto"
            style={{ color: "#7c6aaa", lineHeight: 1.6 }}
          >
            The most powerful AI assistant ever built.
            <br />
            <span style={{ color: "#a090c8" }}>Ask anything. Get genius-level answers.</span>
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <button
            onClick={() => setLocation("/sign-up")}
            className="btn-nexus flex items-center gap-2.5 text-base px-8 py-3.5 rounded-2xl"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLocation("/sign-in")}
            className="flex items-center gap-2 text-base px-8 py-3.5 rounded-2xl font-semibold transition-all"
            style={{
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.35)",
              color: "#c4b5fd",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.2)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.6)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.35)";
            }}
          >
            Sign In
          </button>
        </div>

        {/* Capabilities grid */}
        <div className="grid grid-cols-2 gap-4 w-full mt-4">
          {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col gap-3 p-5 rounded-2xl text-left"
              style={{
                background: "rgba(10,2,24,0.7)",
                border: "1px solid rgba(124,58,237,0.14)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.15))",
                  border: "1px solid rgba(124,58,237,0.35)",
                }}
              >
                <Icon className="w-5 h-5" style={{ color: "#a78bfa" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "#5a4a82" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-xs" style={{ color: "#2a1a40" }}>
          Free to use · Sign in with Google · No credit card required
        </p>
      </div>
    </div>
  );
}

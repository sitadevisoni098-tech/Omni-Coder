import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/HomePage";
import ChatPage from "@/pages/ChatPage";
import { Cpu } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsVariant: "blockButton" as const,
    socialButtonsPlacement: "top" as const,
  },
  variables: {
    colorPrimary: "#7c3aed",
    colorForeground: "#e8e0ff",
    colorMutedForeground: "#7c6aaa",
    colorDanger: "#ef4444",
    colorBackground: "#0a0418",
    colorInput: "#0e0628",
    colorInputForeground: "#e0d8ff",
    colorNeutral: "#3a2a5a",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !rounded-none",
    footer: "!shadow-none !border-0 !rounded-none",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-[#7c6aaa]",
    socialButtonsBlockButtonText: "text-[#d4c8ff] font-medium",
    formFieldLabel: "text-[#a090c8] text-sm",
    footerActionLink: "text-[#a78bfa] hover:text-[#c4b5fd]",
    footerActionText: "text-[#5a4a82]",
    dividerText: "text-[#3a2a5a]",
    identityPreviewEditButton: "text-[#a78bfa]",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-red-400",
    logoBox: "flex justify-center",
    logoImage: "w-12 h-12",
    socialButtonsBlockButton:
      "border border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.1)] hover:bg-[rgba(124,58,237,0.2)] hover:border-[rgba(124,58,237,0.6)] transition-all",
    formButtonPrimary:
      "bg-gradient-to-r from-[#7c3aed] via-[#3b82f6] to-[#06b6d4] hover:opacity-90 shadow-lg shadow-purple-900/40 font-semibold",
    formFieldInput:
      "bg-[#0e0628] border-[rgba(124,58,237,0.25)] text-[#e0d8ff] focus:border-[rgba(124,58,237,0.65)] focus:ring-[rgba(124,58,237,0.15)]",
    footerAction: "bg-[rgba(124,58,237,0.05)] border-t border-[rgba(124,58,237,0.12)]",
    dividerLine: "bg-[rgba(124,58,237,0.2)]",
    alert: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]",
    otpCodeFieldInput: "border-[rgba(124,58,237,0.3)] bg-[#0e0628] text-white",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

/* Full-screen loading spinner while Clerk initialises */
function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "#060010" }}
    >
      <div className="flex flex-col items-center gap-5">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)",
            boxShadow: "0 0 40px rgba(124,58,237,0.6)",
            animation: "pulse 2s ease-in-out infinite",
          }}
        >
          <Cpu className="w-8 h-8 text-white" />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: "#7c3aed",
                animation: `thinking-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== uid) {
        qc.clear();
      }
      prevUserIdRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function SignInPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="nexus-bg"><div className="orb-3" /></div>
      <div className="nexus-grid" />
      <div className="relative z-10 w-full">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="nexus-bg"><div className="orb-3" /></div>
      <div className="nexus-grid" />
      <div className="relative z-10 w-full">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <Redirect to="/chat" />;
  return <HomePage />;
}

function ChatRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect to="/" />;
  return <ChatPage />;
}

function AppRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back to Nexus", subtitle: "Sign in to continue your AI journey" } },
        signUp: { start: { title: "Join Nexus AI", subtitle: "Create your account and unleash the power" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/chat" component={ChatRoute} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route><Redirect to="/" /></Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRoutes />
    </WouterRouter>
  );
}

export default App;

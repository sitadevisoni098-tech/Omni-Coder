import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Code2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted">
        <Code2 className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground max-w-sm">
        The page you're looking for doesn't exist. Head back to the editor to get coding.
      </p>
      <Link href="/">
        <Button data-testid="link-go-home">Back to Editor</Button>
      </Link>
    </div>
  );
}

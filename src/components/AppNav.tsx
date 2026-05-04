import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppNav() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");
  const isDriver = roles.includes("driver");

  return (
    <nav className="sticky top-0 z-40 h-16 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <Link to="/" className="shrink-0"><Logo /></Link>
        <div className="flex items-center gap-1 text-sm">
          {user && (
            <>
              <Link to="/" className="px-2 md:px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Ride</Link>
              <Link to="/profile" className="px-2 md:px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Profile</Link>
              {isDriver && (
                <Link to="/driver" className="px-2 md:px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Drive</Link>
              )}
              {!isDriver && (
                <Link to="/become-driver" className="px-2 md:px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Become a driver</Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="px-3 py-1.5 text-primary hover:text-primary-glow transition-colors font-medium">Admin</Link>
              )}
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }} className="ml-2 text-muted-foreground">
                <LogOut className="size-4" />
              </Button>
            </>
          )}
          {!user && (
            <Button onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground hover:bg-primary-glow">Log in</Button>
          )}
        </div>
      </div>
    </nav>
  );
}

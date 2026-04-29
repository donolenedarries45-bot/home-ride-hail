import { useAuth } from "@/hooks/useAuth";
import Landing from "./Landing";
import RiderHome from "./RiderHome";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  return user ? <RiderHome /> : <Landing />;
}

import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth-server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { isAdminEmail } from "@/lib/admin-access";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let token: string | null | undefined = null;
  try {
    token = await getToken();
  } catch (error) {
    console.error("[admin layout] Failed to get auth token:", error);
    redirect("/");
  }
  
  if (!token) {
    redirect("/");
  }
  
  try {
    const user = await fetchQuery(
      api.auth.getCurrentUser,
      {},
      { token }
    );
    
    if (!user?.email) {
      redirect("/");
    }
    
    const isAdmin = isAdminEmail(user);
    
    if (!isAdmin) {
      console.log("[admin layout] access denied", {
        userEmail: user.email,
        isAdmin,
      });
      redirect("/");
    }
    
    return <>{children}</>;
  } catch (error: unknown) {
    // Re-throw redirect errors - Next.js redirects work by throwing special errors
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    
    console.error("[admin layout] error checking admin access", error);
    redirect("/");
  }
}

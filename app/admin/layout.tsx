import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth-server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();
  
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
    
    const userEmail = user.email.trim().toLowerCase();
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminEmailsStr = process.env.ADMIN_EMAILS?.trim();
    
    let isAdmin = false;
    
    if (adminEmail && userEmail === adminEmail) {
      isAdmin = true;
    }
    
    if (!isAdmin && adminEmailsStr) {
      const adminEmails = adminEmailsStr.split(",").map(e => e.trim().toLowerCase());
      isAdmin = adminEmails.includes(userEmail);
    }
    
    if (!isAdmin) {
      console.log("[admin layout] access denied", {
        userEmail,
        adminEmail,
        adminEmailsStr,
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

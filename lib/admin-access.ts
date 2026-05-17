type AdminUser = {
  email?: string | null;
};

export function isAdminEmail(user: AdminUser | null | undefined) {
  const userEmail = user?.email?.trim().toLowerCase();

  if (!userEmail) {
    return false;
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminEmailsStr = process.env.ADMIN_EMAILS?.trim();

  if (adminEmail && userEmail === adminEmail) {
    return true;
  }

  if (!adminEmailsStr) {
    return false;
  }

  return adminEmailsStr
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .includes(userEmail);
}

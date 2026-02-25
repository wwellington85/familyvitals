import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AcceptInvitePanel } from "@/components/accept-invite-panel";

export default async function AcceptInvitePage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <p className="text-sm">Missing invite token.</p>;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
  }

  return <AcceptInvitePanel token={token} />;
}

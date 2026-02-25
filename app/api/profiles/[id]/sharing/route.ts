import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProfileRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const sectionEnum = z.enum(["documents", "labs", "vitals", "medications", "snapshots", "insights"]);

const updateSchema = z.object({
  user_id: z.string().uuid(),
  section: sectionEnum,
  can_read: z.boolean()
});

const sectionOrder = ["documents", "labs", "vitals", "medications", "snapshots", "insights"] as const;

type SectionName = (typeof sectionOrder)[number];

type ProfileAccessRow = {
  user_id: string;
  role: "owner" | "editor" | "viewer";
};

type PermissionRow = {
  user_id: string;
  section: SectionName;
  can_read: boolean;
};

async function buildSharingPayload(profileId: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: accessRows, error: accessError }, { data: permissionRows, error: permissionsError }] = await Promise.all([
    admin.from("profile_access").select("user_id, role").eq("profile_id", profileId),
    admin.from("profile_section_permissions").select("user_id, section, can_read").eq("profile_id", profileId)
  ]);

  if (accessError) {
    throw new Error(accessError.message);
  }

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  const permissionMap = new Map<string, Partial<Record<SectionName, boolean>>>();
  for (const row of (permissionRows as PermissionRow[] | null) ?? []) {
    const key = row.user_id;
    const current = permissionMap.get(key) ?? {};
    current[row.section] = row.can_read;
    permissionMap.set(key, current);
  }

  const members = await Promise.all(
    ((accessRows as ProfileAccessRow[] | null) ?? []).map(async (member) => {
      const authUser = await admin.auth.admin.getUserById(member.user_id);
      const email = authUser.data.user?.email ?? null;
      const sectionState: Record<SectionName, boolean> = {
        documents: true,
        labs: true,
        vitals: true,
        medications: true,
        snapshots: true,
        insights: true
      };

      const overrides = permissionMap.get(member.user_id);
      if (overrides) {
        for (const section of sectionOrder) {
          if (typeof overrides[section] === "boolean") {
            sectionState[section] = overrides[section] as boolean;
          }
        }
      }

      if (member.role === "owner") {
        for (const section of sectionOrder) {
          sectionState[section] = true;
        }
      }

      return {
        user_id: member.user_id,
        email,
        role: member.role,
        sections: sectionState
      };
    })
  );

  return { members, sections: sectionOrder };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireProfileRole(id);

  if (role !== "owner") {
    return NextResponse.json({ error: "Only owner can manage sharing" }, { status: 403 });
  }

  try {
    const payload = await buildSharingPayload(id);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sharing settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role } = await requireProfileRole(id);

  if (role !== "owner") {
    return NextResponse.json({ error: "Only owner can manage sharing" }, { status: 403 });
  }

  const body = updateSchema.parse(await req.json());
  const admin = createSupabaseAdminClient();

  const { data: targetAccess, error: targetError } = await admin
    .from("profile_access")
    .select("role")
    .eq("profile_id", id)
    .eq("user_id", body.user_id)
    .single();

  if (targetError || !targetAccess) {
    return NextResponse.json({ error: "Target user does not have profile access" }, { status: 400 });
  }

  if (targetAccess.role === "owner") {
    return NextResponse.json({ error: "Owner access cannot be restricted" }, { status: 400 });
  }

  const { error: upsertError } = await admin.from("profile_section_permissions").upsert(
    {
      profile_id: id,
      user_id: body.user_id,
      section: body.section,
      can_read: body.can_read,
      created_by_user_id: user.id
    },
    { onConflict: "profile_id,user_id,section" }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

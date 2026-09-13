import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createGroup, signOut } from "./actions";
import LoginCodeReveal from "./login-code-reveal";

export default async function GroupsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, friend_code")
    .eq("id", user!.id)
    .single();

  const { data: secret } = await supabase
    .from("profile_secrets")
    .select("login_code")
    .eq("id", user!.id)
    .single();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name)")
    .eq("user_id", user!.id);

  const groupIds = (memberships ?? []).map((m: any) => m.group_id);

  const { data: balances } = groupIds.length
    ? await supabase.from("member_balances").select("*").in("group_id", groupIds)
    : { data: [] as any[] };

  const totalsByGroup = new Map<string, number>();
  (balances ?? []).forEach((b: any) => {
    totalsByGroup.set(
      b.group_id,
      (totalsByGroup.get(b.group_id) ?? 0) + Number(b.total_owed_to_them)
    );
  });

  return (
    <div className="px-5 pt-6 pb-10">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-[21px] font-medium">สวัสดี {profile?.display_name}</h1>
        <form action={signOut}>
          <button className="text-[13px] text-muted hover:text-ink">ออกจากระบบ</button>
        </form>
      </div>

      <div className="bg-white border border-line rounded-[10px] px-4 py-3 mb-2 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-muted">รหัสเพื่อนของคุณ</p>
          <p className="text-[18px] font-medium tracking-wider">{profile?.friend_code}</p>
        </div>
        <p className="text-[12px] text-muted max-w-[140px] text-right">
          บอกรหัสนี้ให้เพื่อน เพื่อให้เพื่อนเพิ่มคุณเข้ากลุ่มได้
        </p>
      </div>

      <LoginCodeReveal loginCode={secret?.login_code ?? ""} />

      {!memberships?.length ? (
        <div className="text-center py-14">
          <p className="text-[15px] font-medium">ยังไม่มีกลุ่ม</p>
          <p className="text-[13px] text-muted mt-1">สร้างกลุ่มแรกเพื่อเริ่มจดบันทึกหนี้</p>
        </div>
      ) : (
        <ul className="space-y-2 mt-5">
          {memberships.map((m: any) => (
            <li key={m.group_id}>
              <Link
                href={`/groups/${m.group_id}`}
                className="block bg-white border border-line rounded-[10px] px-4 py-3 hover:border-muted transition"
              >
                <p className="text-[16px] font-medium">{m.groups?.name}</p>
                {totalsByGroup.get(m.group_id) ? (
                  <p className="text-[13px] text-debt mt-0.5">
                    ค้างอยู่ {Number(totalsByGroup.get(m.group_id)).toLocaleString("th-TH")} บาท
                  </p>
                ) : (
                  <p className="text-[13px] text-muted mt-0.5">ไม่มีหนี้ค้าง</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form action={createGroup} className="mt-5 flex gap-2">
        <input
          name="name"
          placeholder="ชื่อกลุ่มใหม่"
          required
          className="flex-1 border border-line rounded-[8px] px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-debt"
        />
        <button className="px-4 py-2 rounded-[8px] bg-ink text-white text-[14px] font-medium hover:opacity-90">
          สร้าง
        </button>
      </form>
    </div>
  );
}

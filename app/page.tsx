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

  const gradients = [
    "from-[#5B7CFA] to-[#3F5CD8]",
    "from-[#6FC3A0] to-[#3B9E76]",
    "from-[#F5A5B0] to-[#D9646F]",
    "from-[#F5C463] to-[#E39A2C]",
  ];

  return (
    <div className="pb-10">
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-muted">สวัสดี</p>
          <p className="text-[21px] font-semibold text-blueDeep">{profile?.display_name} 👋</p>
        </div>
        <form action={signOut}>
          <button
            aria-label="ออกจากระบบ"
            className="w-10 h-10 rounded-[14px] bg-card shadow-soft flex items-center justify-center text-muted text-[12px]"
          >
            ออก
          </button>
        </form>
      </div>

      <div className="px-5 mt-3 space-y-2">
        <div className="bg-card rounded-[14px] shadow-soft px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted">รหัสเพื่อนของคุณ</p>
            <p className="text-[16px] font-semibold tracking-wider text-blueDeep">
              {profile?.friend_code}
            </p>
          </div>
          <p className="text-[11px] text-muted max-w-[130px] text-right">
            บอกรหัสนี้ให้เพื่อน เพื่อเพิ่มคุณเข้ากลุ่มได้
          </p>
        </div>

        <LoginCodeReveal loginCode={secret?.login_code ?? ""} />
      </div>

      {!memberships?.length ? (
        <div className="text-center py-14 px-5">
          <p className="text-[15px] font-medium">ยังไม่มีกลุ่ม</p>
          <p className="text-[13px] text-muted mt-1">สร้างกลุ่มแรกเพื่อเริ่มจดบันทึกหนี้</p>
        </div>
      ) : (
        <>
          <p className="px-5 mt-5 mb-2 text-[14px] font-semibold text-blueDeep">กลุ่มของคุณ</p>
          <div className="px-5 space-y-3">
            {memberships.map((m: any, i: number) => {
              const total = totalsByGroup.get(m.group_id) ?? 0;
              return (
                <Link
                  key={m.group_id}
                  href={`/groups/${m.group_id}`}
                  className={`block rounded-[18px] shadow-card p-4 bg-gradient-to-br ${
                    gradients[i % gradients.length]
                  } relative overflow-hidden`}
                >
                  <div className="absolute -right-8 -bottom-10 w-28 h-28 rounded-full bg-white/10" />
                  <p className="text-[15px] font-semibold text-white relative z-10">
                    {m.groups?.name}
                  </p>
                  <p className="text-[12px] text-white/75 mt-1 relative z-10">
                    {total > 0 ? `ค้างอยู่ ${total.toLocaleString("th-TH")} บาท` : "ไม่มีหนี้ค้าง"}
                  </p>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <form action={createGroup} className="mt-6 px-5 flex gap-2">
        <input
          name="name"
          placeholder="ชื่อกลุ่มใหม่"
          required
          className="flex-1 border border-line rounded-[10px] px-3 py-2.5 text-[14px] bg-card shadow-soft focus:outline-none focus:border-blue"
        />
        <button className="px-4 py-2.5 rounded-[10px] bg-blue text-white text-[14px] font-medium shadow-soft hover:opacity-90">
          สร้าง
        </button>
      </form>
    </div>
  );
}

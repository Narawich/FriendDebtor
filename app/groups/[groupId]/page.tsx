import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addMemberByCode, deleteGroup } from "../../actions";

export default async function GroupPage({ params }: { params: { groupId: string } }) {
  const supabase = createClient();
  const { groupId } = params;

  const { data: group } = await supabase.from("groups").select("*").eq("id", groupId).single();
  const { data: members } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at");

  const { data: balances } = await supabase
    .from("member_balances")
    .select("*")
    .eq("group_id", groupId);

  const balanceByMember = new Map((balances ?? []).map((b: any) => [b.member_id, b]));

  const addMemberWithGroup = addMemberByCode.bind(null, groupId);
  const deleteGroupWithId = deleteGroup.bind(null, groupId);

  const avatarColors = [
    { bg: "#E4ECFB", text: "#3A56C4" },
    { bg: "#FEF3DE", text: "#B87A1B" },
    { bg: "#E4F8EE", text: "#22935F" },
    { bg: "#FDE8E9", text: "#D9424C" },
  ];

  return (
    <div className="pb-10">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link
          href="/"
          aria-label="ย้อนกลับ"
          className="w-9 h-9 rounded-[12px] bg-card shadow-soft flex items-center justify-center text-blueDeep"
        >
          ‹
        </Link>
        <h1 className="text-[19px] font-semibold text-blueDeep">{group?.name}</h1>
      </div>

      {!members?.length ? (
        <div className="text-center py-10 px-5">
          <p className="text-[15px] font-medium">ยังไม่มีเพื่อนในกลุ่มนี้</p>
          <p className="text-[13px] text-muted mt-1">เพิ่มเพื่อนด้วยรหัสเพื่อนของเขาด้านล่าง</p>
        </div>
      ) : (
        <ul className="px-5 space-y-2">
          {members.map((m, i) => {
            const bal = balanceByMember.get(m.id);
            const color = avatarColors[i % avatarColors.length];
            return (
              <li key={m.id}>
                <Link
                  href={`/groups/${groupId}/members/${m.id}`}
                  className="flex items-center justify-between bg-card rounded-[14px] shadow-soft px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-[12px] flex items-center justify-center text-[14px] font-semibold"
                      style={{ background: color.bg, color: color.text }}
                    >
                      {m.display_name.slice(0, 1)}
                    </div>
                    <p className="text-[14.5px] font-medium">{m.display_name}</p>
                  </div>
                  <p className="text-[13px] font-medium text-debt">
                    {bal && Number(bal.total_owed_to_them) > 0
                      ? `${Number(bal.total_owed_to_them).toLocaleString("th-TH")} บาท`
                      : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-5 mt-5">
        <form action={addMemberWithGroup} className="bg-card rounded-[14px] shadow-soft p-4 space-y-2">
          <p className="text-[13px] font-medium text-blueDeep">เพิ่มเพื่อนด้วยรหัสเพื่อน</p>
          <input
            name="code"
            placeholder="เช่น PX7K2M"
            required
            maxLength={6}
            style={{ textTransform: "uppercase" }}
            className="w-full border border-line rounded-[10px] px-3 py-2 text-[14px] bg-page focus:outline-none focus:border-blue tracking-wider"
          />
          <button className="w-full py-2.5 rounded-[10px] bg-blue text-white text-[14px] font-medium hover:opacity-90">
            เพิ่มเข้ากลุ่ม
          </button>
        </form>

        <form action={deleteGroupWithId} className="mt-3">
          <button className="w-full text-[13px] text-muted hover:text-debt py-2">ลบกลุ่มนี้</button>
        </form>
      </div>
    </div>
  );
}

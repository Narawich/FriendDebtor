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

  return (
    <div className="px-5 pt-6 pb-10">
      <div className="flex items-center gap-2 mb-5">
        <Link href="/" className="text-muted text-[18px]" aria-label="ย้อนกลับ">
          ‹
        </Link>
        <h1 className="text-[21px] font-medium">{group?.name}</h1>
      </div>

      {!members?.length ? (
        <div className="text-center py-10">
          <p className="text-[15px] font-medium">ยังไม่มีเพื่อนในกลุ่มนี้</p>
          <p className="text-[13px] text-muted mt-1">เพิ่มเพื่อนด้วยรหัสเพื่อนของเขาด้านล่าง</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => {
            const bal = balanceByMember.get(m.id);
            return (
              <li key={m.id}>
                <Link
                  href={`/groups/${groupId}/members/${m.id}`}
                  className="flex items-center justify-between bg-white border border-line rounded-[10px] px-4 py-3 hover:border-muted transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#EFEADC] flex items-center justify-center text-[13px] font-medium">
                      {m.display_name.slice(0, 1)}
                    </div>
                    <p className="text-[15px] font-medium">{m.display_name}</p>
                  </div>
                  <p className="text-[13px] text-debt">
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

      <form action={addMemberWithGroup} className="mt-5 space-y-2">
        <p className="text-[13px] text-muted">เพิ่มเพื่อนด้วยรหัสเพื่อน</p>
        <input
          name="code"
          placeholder="เช่น PX7K2M"
          required
          maxLength={6}
          style={{ textTransform: "uppercase" }}
          className="w-full border border-line rounded-[8px] px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-debt tracking-wider"
        />
        <button className="w-full py-2.5 rounded-[8px] border border-dashed border-line text-[14px] text-muted hover:bg-[#EFEADC]">
          เพิ่มเข้ากลุ่ม
        </button>
      </form>

      <form action={deleteGroupWithId} className="mt-3">
        <button className="w-full text-[13px] text-muted hover:text-debt py-2">ลบกลุ่มนี้</button>
      </form>
    </div>
  );
}

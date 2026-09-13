import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDebt, togglePaid, deleteDebt } from "../../../../actions";

function isOverdue(dueDate: string | null, paid: boolean) {
  if (!dueDate || paid) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default async function MemberPage({
  params,
}: {
  params: { groupId: string; memberId: string };
}) {
  const supabase = createClient();
  const { groupId, memberId } = params;

  const { data: member } = await supabase
    .from("group_members")
    .select("*")
    .eq("id", memberId)
    .single();

  const { data: allMembers } = await supabase
    .from("group_members")
    .select("id, display_name")
    .eq("group_id", groupId)
    .neq("id", memberId);

  const { data: debts } = await supabase
    .from("debts")
    .select("*, debtor:debtor_member_id(display_name)")
    .eq("creditor_member_id", memberId)
    .order("paid")
    .order("due_date", { nullsFirst: false });

  const unpaid = (debts ?? []).filter((d) => !d.paid);
  const paid = (debts ?? []).filter((d) => d.paid);
  const total = unpaid.reduce((s, d) => s + Number(d.amount), 0);

  const addDebtWithIds = addDebt.bind(null, groupId, memberId);

  return (
    <div className="px-5 pt-6 pb-10">
      <div className="flex items-center gap-2 mb-5">
        <Link href={`/groups/${groupId}`} className="text-muted text-[18px]" aria-label="ย้อนกลับ">
          ‹
        </Link>
        <h1 className="text-[21px] font-medium">{member?.display_name}</h1>
      </div>

      {total > 0 && (
        <div className="bg-white border border-line rounded-[10px] px-4 py-3 mb-4 flex items-center justify-between">
          <p className="text-[13px] text-muted">ยอดค้างทั้งหมด</p>
          <p className="text-[19px] font-medium text-debt">
            {total.toLocaleString("th-TH")} บาท
          </p>
        </div>
      )}

      {!debts?.length ? (
        <div className="text-center py-10">
          <p className="text-[15px] font-medium">ยังไม่มีรายการหนี้</p>
          <p className="text-[13px] text-muted mt-1">บันทึกว่าใครติดหนี้ {member?.display_name}</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {unpaid.map((d) => (
              <DebtRow key={d.id} debt={d} groupId={groupId} memberId={memberId} />
            ))}
          </ul>
          {paid.length > 0 && (
            <>
              <p className="text-[12px] text-muted mt-5 mb-2 px-1">จ่ายแล้ว</p>
              <ul className="space-y-2 opacity-60">
                {paid.map((d) => (
                  <DebtRow key={d.id} debt={d} groupId={groupId} memberId={memberId} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <form action={addDebtWithIds} className="mt-5 space-y-2">
        <p className="text-[13px] text-muted">เพิ่มรายการหนี้</p>
        <select
          name="debtor_member_id"
          required
          className="w-full border border-line rounded-[8px] px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-debt"
        >
          <option value="">ใครติดหนี้</option>
          {allMembers?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="จำนวนเงิน (บาท)"
          required
          className="w-full border border-line rounded-[8px] px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-debt"
        />
        <input
          name="reason"
          placeholder="ค่าอะไร"
          className="w-full border border-line rounded-[8px] px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-debt"
        />
        <input
          name="payment_channel"
          placeholder="ช่องทางชำระ เช่น พร้อมเพย์"
          className="w-full border border-line rounded-[8px] px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-debt"
        />
        <div>
          <label className="block text-[12px] text-muted mb-1">วันครบกำหนดจ่าย</label>
          <input
            name="due_date"
            type="date"
            className="w-full border border-line rounded-[8px] px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-debt"
          />
        </div>
        <button className="w-full py-2.5 rounded-[8px] bg-ink text-white text-[14px] font-medium hover:opacity-90">
          บันทึก
        </button>
      </form>
    </div>
  );
}

function DebtRow({
  debt,
  groupId,
  memberId,
}: {
  debt: any;
  groupId: string;
  memberId: string;
}) {
  const overdue = isOverdue(debt.due_date, debt.paid);
  const toggle = togglePaid.bind(null, groupId, memberId, debt.id, debt.paid);
  const remove = deleteDebt.bind(null, groupId, memberId, debt.id);

  return (
    <li
      className={`bg-white border rounded-[10px] px-4 py-3 ${
        overdue ? "border-debt" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">{debt.debtor?.display_name}</p>
          {debt.reason && <p className="text-[13px] text-muted mt-0.5">{debt.reason}</p>}
          {debt.payment_channel && (
            <p className="text-[12px] text-muted mt-1">ชำระผ่าน: {debt.payment_channel}</p>
          )}
          {debt.due_date && (
            <p className={`text-[12px] mt-1 ${overdue ? "text-debt font-medium" : "text-muted"}`}>
              {overdue ? "เลยกำหนดแล้ว · " : "ครบกำหนด "}
              {new Date(debt.due_date).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p
            className={`text-[15px] font-medium ${
              debt.paid ? "text-muted line-through" : "text-debt"
            }`}
          >
            {Number(debt.amount).toLocaleString("th-TH")} บาท
          </p>
          <div className="flex items-center gap-1">
            <form action={toggle}>
              <button
                aria-label={debt.paid ? "ยกเลิกว่าจ่ายแล้ว" : "ทำเครื่องหมายว่าจ่ายแล้ว"}
                className={`w-7 h-7 rounded-full border text-[12px] ${
                  debt.paid ? "bg-[#DCE7D3] border-[#B7CBA5]" : "border-line hover:bg-[#EFEADC]"
                }`}
              >
                ✓
              </button>
            </form>
            <form action={remove}>
              <button
                aria-label="ลบรายการ"
                className="w-7 h-7 rounded-full border border-line hover:bg-[#F3E3DE] text-[12px]"
              >
                ×
              </button>
            </form>
          </div>
        </div>
      </div>
    </li>
  );
}

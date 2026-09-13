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
  const paidList = (debts ?? []).filter((d) => d.paid);
  const total = (debts ?? []).reduce((s, d) => s + Number(d.amount), 0);
  const paidAmount = paidList.reduce((s, d) => s + Number(d.amount), 0);
  const remaining = total - paidAmount;

  const addDebtWithIds = addDebt.bind(null, groupId, memberId);

  return (
    <div className="pb-10">
      <div className="bg-blue rounded-b-[22px] px-5 pt-6 pb-8 flex items-center gap-3">
        <Link
          href={`/groups/${groupId}`}
          aria-label="ย้อนกลับ"
          className="w-8 h-8 rounded-[10px] bg-white/20 flex items-center justify-center text-white"
        >
          ‹
        </Link>
        <h1 className="text-[16px] font-semibold text-white">{member?.display_name}</h1>
      </div>

      <div className="mx-5 -mt-5 bg-card rounded-[16px] shadow-card p-4 relative z-10">
        <div className="flex justify-between text-[12px] text-muted mb-2">
          <span>รายการ</span>
          <span>จำนวนเงิน</span>
        </div>

        {!debts?.length ? (
          <div className="text-center py-8">
            <p className="text-[14px] font-medium">ยังไม่มีรายการหนี้</p>
            <p className="text-[12px] text-muted mt-1">บันทึกว่าใครติดหนี้ {member?.display_name}</p>
          </div>
        ) : (
          <>
            {unpaid.map((d) => {
              const overdue = isOverdue(d.due_date, d.paid);
              return (
                <DebtRow key={d.id} debt={d} groupId={groupId} memberId={memberId} overdue={overdue} />
              );
            })}
            {paidList.length > 0 && (
              <>
                <p className="text-[11px] text-muted mt-3 mb-1">จ่ายแล้ว</p>
                {paidList.map((d) => (
                  <DebtRow key={d.id} debt={d} groupId={groupId} memberId={memberId} overdue={false} />
                ))}
              </>
            )}

            <div className="mt-3 pt-3 border-t border-dashed border-line">
              <div className="flex justify-between text-[13px] text-muted mb-1.5">
                <span>ยอดรวม</span>
                <span>{total.toLocaleString("th-TH")} บาท</span>
              </div>
              <div className="flex justify-between text-[13px] text-muted mb-1.5">
                <span>จ่ายแล้ว</span>
                <span>-{paidAmount.toLocaleString("th-TH")} บาท</span>
              </div>
              <div className="flex justify-between text-[15px] font-bold">
                <span>ค้างชำระ</span>
                <span className="text-blue">{remaining.toLocaleString("th-TH")} บาท</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mx-5 mt-4 bg-card rounded-[14px] shadow-soft p-4">
        <p className="text-[13px] font-medium text-blueDeep mb-2">เพิ่มรายการหนี้</p>
        <form action={addDebtWithIds} className="space-y-2">
          <select
            name="debtor_member_id"
            required
            className="w-full border border-line rounded-[10px] px-3 py-2 text-[14px] bg-page focus:outline-none focus:border-blue"
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
            className="w-full border border-line rounded-[10px] px-3 py-2 text-[14px] bg-page focus:outline-none focus:border-blue"
          />
          <input
            name="reason"
            placeholder="ค่าอะไร"
            className="w-full border border-line rounded-[10px] px-3 py-2 text-[14px] bg-page focus:outline-none focus:border-blue"
          />
          <input
            name="payment_channel"
            placeholder="ช่องทางชำระ เช่น พร้อมเพย์"
            className="w-full border border-line rounded-[10px] px-3 py-2 text-[14px] bg-page focus:outline-none focus:border-blue"
          />
          <div>
            <label className="block text-[12px] text-muted mb-1">วันครบกำหนดจ่าย</label>
            <input
              name="due_date"
              type="date"
              className="w-full border border-line rounded-[10px] px-3 py-2 text-[14px] bg-page focus:outline-none focus:border-blue"
            />
          </div>
          <button className="w-full py-2.5 rounded-[10px] bg-blue text-white text-[14px] font-medium hover:opacity-90">
            บันทึก
          </button>
        </form>
      </div>
    </div>
  );
}

function DebtRow({
  debt,
  groupId,
  memberId,
  overdue,
}: {
  debt: any;
  groupId: string;
  memberId: string;
  overdue: boolean;
}) {
  const toggle = togglePaid.bind(null, groupId, memberId, debt.id, debt.paid);
  const remove = deleteDebt.bind(null, groupId, memberId, debt.id);

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-[10px] bg-soft flex items-center justify-center text-[13px] font-semibold text-blueDeep shrink-0">
          {debt.debtor?.display_name?.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className={`text-[13.5px] font-medium ${debt.paid ? "text-muted line-through" : "text-ink"}`}>
            {debt.debtor?.display_name}
          </p>
          {debt.reason && <p className="text-[11.5px] text-muted">{debt.reason}</p>}
          {debt.due_date && (
            <p className={`text-[11px] ${overdue ? "text-debt font-medium" : "text-muted"}`}>
              {overdue ? "เลยกำหนดแล้ว" : "ครบกำหนด"}{" "}
              {new Date(debt.due_date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-[13.5px] font-semibold ${debt.paid ? "text-muted line-through" : "text-ink"}`}
        >
          {Number(debt.amount).toLocaleString("th-TH")}
        </span>
        <form action={toggle}>
          <button
            aria-label={debt.paid ? "ยกเลิกว่าจ่ายแล้ว" : "ทำเครื่องหมายว่าจ่ายแล้ว"}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
              debt.paid ? "bg-greenBg text-green" : "bg-page text-muted"
            }`}
          >
            ✓
          </button>
        </form>
        <form action={remove}>
          <button aria-label="ลบรายการ" className="w-6 h-6 rounded-full bg-page text-muted text-[11px]">
            ×
          </button>
        </form>
      </div>
    </div>
  );
}

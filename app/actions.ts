"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ต้องเข้าสู่ระบบก่อน");
  return { supabase, user };
}

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("กรอกชื่อกลุ่มก่อน");

  const { supabase, user } = await requireUser();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, created_by: user.id })
    .select()
    .single();
  if (groupError) throw new Error(groupError.message);

  // ผู้สร้างกลุ่มเป็นสมาชิกคนแรกโดยอัตโนมัติ
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    invited_email: profile?.email ?? null,
    display_name: profile?.display_name ?? "ฉัน",
    status: "joined",
    invited_by: user.id,
  });

  revalidatePath("/");
  redirect(`/groups/${group.id}`);
}

export async function deleteGroup(groupId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

export async function inviteMember(groupId: string, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") || "").trim();
  if (!email || !displayName) throw new Error("กรอกชื่อและอีเมลให้ครบ");

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    invited_email: email,
    display_name: displayName,
    status: "invited",
    invited_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/groups/${groupId}`);
}

// เรียกตอนผู้ใช้ที่ล็อกอินแล้วกดรับคำเชิญที่ตรงกับอีเมลตัวเอง
export async function acceptInvite(memberId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("group_members")
    .update({ status: "joined", user_id: user.id })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function addDebt(
  groupId: string,
  creditorMemberId: string,
  formData: FormData
) {
  const debtorMemberId = String(formData.get("debtor_member_id") || "");
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") || "").trim();
  const paymentChannel = String(formData.get("payment_channel") || "").trim();
  const dueDate = String(formData.get("due_date") || "").trim();

  if (!debtorMemberId) throw new Error("เลือกว่าใครติดหนี้");
  if (!amount || amount <= 0) throw new Error("กรอกจำนวนเงินให้ถูกต้อง");

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("debts").insert({
    group_id: groupId,
    creditor_member_id: creditorMemberId,
    debtor_member_id: debtorMemberId,
    amount,
    reason: reason || null,
    payment_channel: paymentChannel || null,
    due_date: dueDate || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/groups/${groupId}/members/${creditorMemberId}`);
}

export async function togglePaid(groupId: string, memberId: string, debtId: string, paid: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("debts")
    .update({ paid: !paid, paid_at: !paid ? new Date().toISOString() : null })
    .eq("id", debtId);
  if (error) throw new Error(error.message);
  revalidatePath(`/groups/${groupId}/members/${memberId}`);
}

export async function deleteDebt(groupId: string, memberId: string, debtId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("debts").delete().eq("id", debtId);
  if (error) throw new Error(error.message);
  revalidatePath(`/groups/${groupId}/members/${memberId}`);
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

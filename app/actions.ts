"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
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

  const groupId = randomUUID();

  const { error: groupError } = await supabase
    .from("groups")
    .insert({ id: groupId, name, created_by: user.id });
  if (groupError) throw new Error(groupError.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: user.id,
    display_name: profile?.display_name ?? "ฉัน",
    invited_by: user.id,
  });
  if (memberError) throw new Error(memberError.message);

  revalidatePath("/");
  redirect(`/groups/${groupId}`);
}

export async function deleteGroup(groupId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

export async function addMemberByCode(groupId: string, formData: FormData) {
  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!code) throw new Error("กรอกรหัสเพื่อนก่อน");

  const { supabase, user } = await requireUser();

  const { data: targetProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("friend_code", code)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);
  if (!targetProfile) throw new Error("ไม่พบรหัสนี้ ลองเช็คกับเพื่อนอีกครั้ง");

  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: targetProfile.id,
    display_name: targetProfile.display_name,
    invited_by: user.id,
  });
  if (error) {
    if (error.code === "23505") throw new Error("คนนี้อยู่ในกลุ่มนี้อยู่แล้ว");
    throw new Error(error.message);
  }

  revalidatePath(`/groups/${groupId}`);
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

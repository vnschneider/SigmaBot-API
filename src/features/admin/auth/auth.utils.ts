// src/features/admin/auth/auth.utils.ts
import { AdminModel } from "../../../infrastructure/db/models/admin/admin";
import { AdminActivityModel } from "../../../infrastructure/db/models/admin/adminActivity";
import crypto from "crypto";

export async function generateAccessKey(createdBy: string) {
  const accessKey = `sigma_${crypto.randomBytes(8).toString("hex")}`;
  await AdminModel.create({ accessKey, createdBy });
  return accessKey;
}

export async function logAdminActivity(
  session: any,
  action: string,
  metadata?: any
) {
  await AdminActivityModel.create({
    adminId: session.adminId,
    action,
    metadata,
  });
}

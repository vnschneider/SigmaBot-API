// src/db/models/adminActivity.ts
import { Schema, model } from "mongoose";

const AdminActivitySchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
  action: { type: String, required: true },
  entityType: String,
  entityId: Schema.Types.ObjectId,
  metadata: Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});

export const AdminActivityModel = model("AdminActivity", AdminActivitySchema);

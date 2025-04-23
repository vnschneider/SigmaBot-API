import { Schema, model } from "mongoose";

const AdminSchema = new Schema({
  accessKey: { type: String, required: true, unique: true },
  accessLevel: {
    type: String,
    enum: ["master", "standard"],
    default: "standard",
  },
  createdAt: { type: Date, default: Date.now },
  createdBy: {
    type: Schema.Types.Mixed,
    validate: {
      validator: function (value: any) {
        return (
          typeof value === "string" ||
          (value && value.toString().match(/^[0-9a-fA-F]{24}$/))
        );
      },
      message: "O campo 'createdBy' deve ser um ObjectId válido ou uma string.",
    },
  },
});

export const AdminModel = model("Admin", AdminSchema);

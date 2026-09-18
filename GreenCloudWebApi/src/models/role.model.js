import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    page: { type: String, required: true },
    visible: { type: Boolean, default: false },
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    permissions: {
      type: Map,
      of: {
        visible: { type: Boolean, default: false },
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "roles",
  }
);

const Role = mongoose.model("roles", roleSchema);
export default Role;

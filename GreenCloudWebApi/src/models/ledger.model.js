import mongoose from "mongoose";

// One ledger per customer — all financial transactions hang off it
const ledgerSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customers",
      required: true,
      unique: true, // business rule #5: one primary ledger per customer
      index: true,
    },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true, collection: "account_ledgers" }
);

export default mongoose.model("account_ledgers", ledgerSchema);

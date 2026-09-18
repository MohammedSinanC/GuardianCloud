import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customerCode: { type: String, unique: true, sparse: true, trim: true },

    // Dedup keys — approval looks up by these before creating a new customer
    companyName: { type: String, required: [true, "Company name is required"], trim: true },
    contactPerson: { type: String, trim: true, default: "" },
    mobile: { type: String, required: [true, "Mobile is required"], trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },

    customerType: {
      type: String,
      enum: ["INDIVIDUAL", "COMPANY", "GOVERNMENT"],
      default: "COMPANY",
    },

    trnNumber: { type: String, trim: true, default: "" },
    paymentTerms: { type: String, trim: true, default: "" },

    // Origin — the lead that created this customer (empty for manually created customers)
    sourceLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "leads", default: null },

    // ERP chain
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "admins", default: null },
    ledgerId: { type: mongoose.Schema.Types.ObjectId, ref: "account_ledgers", default: null },

    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdByName: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByName: { type: String, default: "" },
  },
  { timestamps: true, collection: "customers" }
);

customerSchema.pre("save", async function (next) {
  if (this.isNew && !this.customerCode) {
    const count = await mongoose.model("customers").countDocuments();
    this.customerCode = `CUS-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

export default mongoose.model("customers", customerSchema);

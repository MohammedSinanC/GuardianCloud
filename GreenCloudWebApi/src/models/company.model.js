import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    tagline: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    whatsapp: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    workingHours: {
      type: String,
      default: "",
      trim: true,
    },
    yearEstablished: {
      type: Number,
      default: null,
    },
    code: {
      type: String,
      required: [true, "Company code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    logo: {
      type: String,
      default: "",
    },
    favicon: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
      trim: true,
    },
    taxNumber: {
      type: String,
      default: "",
      trim: true,
    },
    commercialRegistration: {
      type: String,
      default: "",
      trim: true,
    },
    vatPercentage: {
      type: Number,
      default: 5,
      min: 0,
      max: 100,
    },
    currency: {
      type: String,
      default: "AED",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "company_masters",
  }
);

const Company = mongoose.model("company_masters", companySchema);
export default Company;

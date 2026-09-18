import Company from "../models/company.model.js";

class CompanyController {
  static async list(req, res) {
    try {
      const companies = await Company.find({}).sort({ name: 1 });
      return res.status(200).json({ success: true, data: companies });
    } catch (error) {
      console.error("Company List Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async getById(req, res) {
    try {
      const company = await Company.findById(req.params.id);
      if (!company) return res.status(404).json({ success: false, message: "Company not found" });
      return res.status(200).json({ success: true, data: company });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async create(req, res) {
    try {
      const { name, code, tagline, email, phone, whatsapp, address, workingHours, yearEstablished, logo, favicon, website, taxNumber, commercialRegistration } = req.body;
      if (!name || !code) return res.status(400).json({ success: false, message: "Name and code are required" });
      const existing = await Company.findOne({ code: code.toUpperCase() });
      if (existing) return res.status(400).json({ success: false, message: "Company code already exists" });
      const company = await Company.create({
        name, code: code.toUpperCase(), tagline: tagline || "", email: email || "",
        phone: phone || "", whatsapp: whatsapp || "", address: address || "",
        workingHours: workingHours || "", yearEstablished: yearEstablished || null,
        logo: logo || "", favicon: favicon || "", website: website || "",
        taxNumber: taxNumber || "", commercialRegistration: commercialRegistration || "",
      });
      return res.status(201).json({ success: true, data: company, message: "Company created" });
    } catch (error) {
      console.error("Company Create Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const company = await Company.findById(id);
      if (!company) return res.status(404).json({ success: false, message: "Company not found" });

      const fields = ["name", "tagline", "email", "phone", "whatsapp", "address", "workingHours", "yearEstablished", "logo", "favicon", "website", "taxNumber", "commercialRegistration", "isActive"];
      fields.forEach(f => { if (req.body[f] !== undefined) company[f] = req.body[f]; });

      await company.save();
      return res.status(200).json({ success: true, data: company, message: "Company updated" });
    } catch (error) {
      console.error("Company Update Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}

export default CompanyController;

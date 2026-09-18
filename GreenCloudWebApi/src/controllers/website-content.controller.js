import WebsiteContent from "../models/website-content.model.js";

class WebsiteContentController {
  /** GET /api/content — get all sections (public) */
  static async getAll(req, res) {
    try {
      const sections = await WebsiteContent.find({ isActive: true });
      const content = {};
      sections.forEach(s => { content[s.key] = s.data; });
      return res.status(200).json({ success: true, data: content });
    } catch (error) {
      console.error("Content getAll Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** GET /api/content/:key — get single section (public) */
  static async getByKey(req, res) {
    try {
      const section = await WebsiteContent.findOne({ key: req.params.key });
      if (!section) return res.status(404).json({ success: false, message: "Section not found" });
      return res.status(200).json({ success: true, data: section });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** PUT /api/content/:key — update section (admin) */
  static async update(req, res) {
    try {
      const { key } = req.params;
      const { data, section, isActive } = req.body;

      const content = await WebsiteContent.findOneAndUpdate(
        { key },
        { data, section: section || key, isActive: isActive !== undefined ? isActive : true },
        { new: true, upsert: true }
      );

      return res.status(200).json({ success: true, data: content, message: "Content updated" });
    } catch (error) {
      console.error("Content update Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  /** POST /api/content/seed — seed all content from JSON (admin) */
  static async seedAll(req, res) {
    try {
      const { content } = req.body;
      if (!content) return res.status(400).json({ success: false, message: "Content data required" });

      const results = [];
      for (const [key, data] of Object.entries(content)) {
        const doc = await WebsiteContent.findOneAndUpdate(
          { key },
          { key, section: key, data, isActive: true },
          { new: true, upsert: true }
        );
        results.push(doc.key);
      }

      return res.status(200).json({ success: true, message: `Seeded ${results.length} sections`, data: results });
    } catch (error) {
      console.error("Content seed Error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}

export default WebsiteContentController;

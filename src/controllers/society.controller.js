import Society from "../models/society.model.js";

// GET all societies
export const getSocieties = async (req, res) => {
  try {
    const societies = await Society.find();
    res.json(societies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST new society
export const addSociety = async (req, res) => {
  try {
    const society = new Society(req.body);
    const saved = await society.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET single society by ID
export const getSocietyById = async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ message: "Society not found" });
    }
    res.json(society);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE society
export const updateSociety = async (req, res) => {
  try {
    const updated = await Society.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) {
      return res.status(404).json({ message: "Society not found" });
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

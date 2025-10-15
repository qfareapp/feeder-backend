import express from "express";
import { getSocieties, addSociety, getSocietyById, updateSociety } from "../controllers/society.controller.js";

const router = express.Router();

router.get("/", getSocieties);
router.post("/", addSociety);
router.get("/:id", getSocietyById);
router.put("/:id", updateSociety);

export default router;

import express from "express";
import { getRoutes, addRoute, searchRoutes, getRouteByNo, updateRoute, deleteRoute, } from "../controllers/route.controller.js";

const router = express.Router();

router.get("/", getRoutes);
router.post("/", addRoute);
router.get("/search", searchRoutes);
router.get("/:routeNo", getRouteByNo);
router.put("/:id", updateRoute);
router.delete("/:id", deleteRoute);

export default router;

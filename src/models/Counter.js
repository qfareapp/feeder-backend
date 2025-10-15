// src/models/Counter.js
import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true }, // e.g. "overall" or "R12"
  value: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;

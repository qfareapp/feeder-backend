import mongoose from "mongoose";

const userOnboardingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    society: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
    },
    timing: { type: String, required: true },
  },
  { timestamps: true }
);

const UserOnboarding = mongoose.model("UserOnboarding", userOnboardingSchema);

export default UserOnboarding;

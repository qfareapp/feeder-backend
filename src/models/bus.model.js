import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const busSchema = new mongoose.Schema(
  {
    operatorName: String,
    authorizedPerson: String,
    contactNumber: String,
    email: String,
    address: String,

    regNumber: { type: String, required: true, unique: true },
    chassisNumber: String,
    engineNumber: String,
    makeModel: String,
    fuelType: String,
    seatingCapacity: Number,
    yom: Number,
    odometer: Number,
    insuranceValidity: Date,
    fitnessValidity: Date,
    pucValidity: Date,

    driverName: String,
    driverLicense: String,
    driverLicenseValidity: Date,
    driverContact: String,
    altDriverName: String,
    helperName: String,

    seatLayout: { type: String, default: "2x2" },
    seats: [Number],

    // Commercial terms
    rateType: String,
    rateValue: Number,
    billingCycle: String,
    paymentMode: String,
    securityDeposit: Number,

    // 🚍 Driver login credentials
    password: { type: String, required: true }, // hashed password for driver

    // 🆕 Boarding QR integration
    qrToken: { type: String, unique: true },
    qrCode: { type: String },

    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

// 🔐 AUTO-GENERATE PASSWORD BEFORE HASHING
busSchema.pre("save", async function (next) {
  // If password is missing (from BusOnboardingForm), auto-create one
  if (!this.password || this.password.trim() === "") {
    const last4 = this.regNumber?.slice(-4) || "0000";
    this.password = `${last4}@bus`;  // 👉 Plain password before hashing
  }

  // If password field was changed OR auto-generated, hash it
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  next();
});

// 🔍 Compare password during login
busSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Bus", busSchema);

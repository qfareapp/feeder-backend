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
    qrToken: { type: String, unique: true }, // ✅ unique identifier for this bus’s QR
    qrCode: { type: String }, // ✅ stores Base64 or hosted image URL

    // Bus operational status
    status: { type: String, default: "active" },
  },
  { timestamps: true }
);

// ✅ Pre-save hook to hash password
busSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ✅ Method to check password
busSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Bus", busSchema);

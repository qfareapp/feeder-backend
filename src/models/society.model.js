import mongoose from "mongoose";

const societySchema = new mongoose.Schema(
  {
    // 1. Administrative / Legal Details
    name: { type: String, required: true },
    registrationNumber: { type: String },
    address: { type: String },
    contactPerson: { type: String },
    phone: { type: String },
    email: { type: String },
    alternateContact: { type: String },
    gst: { type: String },

     // ✅ Logo field (URL or file path)
    logo: { type: String },

    // 2. Resident / Passenger Information
    flats: { type: Number },
    commuters: { type: Number },
    peakMorning: { type: String },
    peakEvening: { type: String },
    verificationSystem: { type: String },

    // 3. Infrastructure & Access
    pickupPoint: { type: String },
    parkingAvailable: { type: String },   // Yes/No
    chargingAvailable: { type: String },  // Yes/No
    securityProtocol: { type: String },
    commChannel: { type: String },

    // 4. Commercial & Financial Terms
    operationMode: { type: String },   // Individual / Bulk passes
    paymentPref: { type: String },     // Per ride / Monthly pass / Society billed
    corporateTieups: { type: String },

    // 5. Legal / Compliance
    insurance: { type: String },
    contractDuration: { type: String },
    specialTerms: { type: String },

    // 6. Data Sharing & Feedback
    reportFrequency: { type: String },
    feedbackMechanism: { type: String },
    dataPrivacy: { type: String }, // Yes/No
  },
  { timestamps: true }
);

const Society = mongoose.model("Society", societySchema);
export default Society;

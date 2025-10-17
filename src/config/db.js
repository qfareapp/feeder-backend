import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // ✅ Choose DB based on environment
    const uri =
      process.env.NODE_ENV === "production"
        ? process.env.MONGO_URI
        : process.env.MONGO_URI_DEV;

    // ✅ Modern connection (no deprecated options)
    const conn = await mongoose.connect(uri);

    // ✅ Color-coded log for clarity
    const color =
      process.env.NODE_ENV === "production" ? "\x1b[33m" : "\x1b[32m"; // yellow for prod, green for dev
    console.log(
      `${color}✅ MongoDB Connected: ${conn.connection.name} [${process.env.NODE_ENV}] \x1b[0m`
    );
  } catch (err) {
    console.error(`❌ MongoDB Error: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;

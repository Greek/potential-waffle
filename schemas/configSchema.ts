import mongoose, { model } from "mongoose";

export const configSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Guild ID
  snipe: { type: Boolean },
});

export default model<Object>("config", configSchema);

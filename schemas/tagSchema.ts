import mongoose, { model } from "mongoose";

export const tagSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // User who made this tag.
  tagContent: { type: String },
});

export default model<Object>("tags", tagSchema);

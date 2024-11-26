const mongoose = require("mongoose");

// Define the Rating schema
const ratingSchema = new mongoose.Schema({
  movieId: { type: String, required: true }, // Movie's IMDb ID or a unique identifier
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 10 },
  createdAt: { type: Date, default: Date.now },
});

// Calculate average rating (optional - can be done on the frontend or when retrieving data)
ratingSchema.statics.calculateAverageRating = async function (movieId) {
  const ratings = await this.aggregate([
    { $match: { movieId } },
    { $group: { _id: "$movieId", averageRating: { $avg: "$rating" } } },
  ]);

  if (ratings.length > 0) {
    return ratings[0].averageRating;
  }
  return 0;
};

const Rating = mongoose.model("Rating", ratingSchema);

module.exports = Rating;

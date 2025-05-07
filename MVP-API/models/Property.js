const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const propertySchema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, required: true },
    bedrooms: { type: Number, required: true },
    toilets: { type: Number, required: true },
    area: { type: Number, required: true },
    description: { type: String },
    about: { type: String },
    amenities: { type: [String] },
    areaReport: { type: String },
    projectionReport: { type: String },
    memorandum: { type: String },
    propertyReport: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);

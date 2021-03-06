/********************************************************
 * Title:       Recipe.js                               *
 * Author:      Mike Nystoriak (nystoriakm@gmail.com)   *
 * Created:     08/30/2021                              *
 * Description: Models a recipe using Mongoose schemas. *
 ********************************************************/

const mongoose = require('mongoose')
const Schema = mongoose.Schema

// anything with units (amounts and durations)
const quantifiableSchema = new Schema({
    readable: { type: String, required: true },
    numeric: Number,
    unit: { type: String, required: true }
}, { _id: false })

const ingredientSchema = new Schema({
    name: { type: String, required: true },
    amount: {
        type: quantifiableSchema,
        required: true
    }
}, { _id: false })

const recipeSchema = new Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        minLength: 4,
        maxLength: 128,
        match: /^[\w'\/#! ]{4,}$/
    },
    media: [String],
    uploader: { type: String, default: 'Anon Y. Mous' },
    createdOn: { type: Date, default: Date.now() },
    modifiedOn: { type: Date, default: Date.now() },
    category: {
        type: String,
        required: true,
        enum: [
            'breakfast',
            'lunch',
            'dinner',
            'appetizer',
            'dessert'
        ]
    },

    // `default` cannot be an arrow function because of `this`
    about: {
        type: String,
        default: function() {
            return `A recipe created by ${this.uploader}.`
        }
    },
    prepTime: { type: quantifiableSchema, required: true },
    ingredients: {
        type: [ingredientSchema],
        validate: v => Array.isArray(v) && v.length > 0
    },
    instructions: {
        type: [String],
        validate: v => Array.isArray(v) && v.length > 0
    }
})

module.exports = mongoose.model('Recipe', recipeSchema)
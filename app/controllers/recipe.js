/************************************************************
 * Title:       recipe.js                                   *
 * Author:      Mike Nystoriak (nystoriakm@gmail.com)       *
 * Created:     09/15/2021                                  *
 * Description: Controls the dataflow of recipe API routes. *
 ************************************************************/

const { recipeService, mediaService } = require('../services')

/**
 * Gets all recipes in the database.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const getAllRecipes = async (req, res) => {
    const { status, data } = await recipeService.fetch()

    // don't send Mongoose versioning field
    data.message.forEach(recipe => recipe.__v = undefined)

    return res.status(status).json(data)
}

/**
 * Gets a single recipe from the database by its ID.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const getRecipeById = async (req, res) => {
    const { id } = req.params
    const { status, data } = await recipeService.fetchById(id)

    // don't send Mongoose versioning field
    data.message.__v = undefined

    return res.status(status).json(data)
}

/**
 * Creates a recipe in the database.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const postRecipe = async (req, res) => {
    const { status, data } = await recipeService.create(req.body)
    return res.status(status).json(data)
}

/**
 * Updates a recipe in the database.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const putRecipe = async (req, res) => {
    const { id } = req.params
    const { status, data } = await recipeService.change(id, req.body)
    return res.status(status).json(data)
}

/**
 * Deletes a recipe in the database.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const deleteRecipe = async (req, res) => {
    const { id } = req.params
    const { status, data } = await recipeService.discard(id)
    return res.status(status).json(data)
}

/**
 * Gets an image file from the database that is linked to
 * a recipe by its unique filename.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const getRecipeMedia = async (req, res) => {
    const { id, filename } = req.params
    const { status, data } = await mediaService.fetch(id, filename)

    if (status !== 200) return res.status(status).json(data)
    const file = data.context
    const type = filename.split('.')[1] === 'png' ? 'png' : 'jpeg'
    return res.set('Content-Type', `image/${type}`)
              .status(status)
              .send(file)
}

/**
 * Attaches images to a recipe.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const postRecipeMedia = async (req, res) => {
    const { id } = req.params

    // update recipe model with filenames
    const temp = await recipeService.setMedia(id, req.files)
    const recipeServiceStatus = temp.status
    const recipeServiceData = temp.data

    // only defer to the media service if recipe service call succeeds
    if (recipeServiceStatus !== 200) {
        return res.status(recipeServiceStatus).json(recipeServiceData)
    }

    // save the files to the disk
    const { status, data } = await mediaService.set(id, req.files)
    return res.status(status).json(data)
}

/**
 * Changes the images associated with a recipe,
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const putRecipeMedia = async (req, res) => {
    const { id } = req.params

    // update recipe model with filenames
    const temp = await recipeService.resetMedia(id, req.files)
    const recipeServiceStatus = temp.status
    const recipeServiceData = temp.data

    // only defer to the media service if recipe service call succeeds
    if (recipeServiceStatus !== 200) {
        return res.status(recipeServiceStatus).json(recipeServiceData)
    }

    // save the files to the disk
    const { status, data } = await mediaService.set(id, req.files, true)
    return res.status(status).json(data)
}

/**
 * Removes the images associated with a recipe,
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const deleteRecipeMedia = async (req, res) => {
    const { id } = req.params

    // update recipe model with filenames
    const temp = await recipeService.unsetMedia(id)
    const recipeServiceStatus = temp.status
    const recipeServiceData = temp.data

    // only defer to the media service if recipe service call succeeds
    if (recipeServiceStatus !== 200) {
        return res.status(recipeServiceStatus).json(recipeServiceData)
    }

    // remove the files from the disk
    const { status, data } = await mediaService.unset(id)
    return res.status(status).json(data)
}

module.exports = {
    getAllRecipes,
    getRecipeById,
    postRecipe,
    putRecipe,
    deleteRecipe,
    getRecipeMedia,
    postRecipeMedia,
    putRecipeMedia,
    deleteRecipeMedia
}
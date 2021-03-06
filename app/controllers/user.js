/**********************************************************
 * Title:       user.js                                   *
 * Author:      Mike Nystoriak (nystoriakm@gmail.com)     *
 * Created:     09/29/2021                                *
 * Description: Controls the dataflow of user API routes. *
 **********************************************************/

const { userService, mediaService, authService } = require('../services')

/**
 * Gets all users in the database.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const getAllUsers = async (req, res) => {
    const { status, data } = await userService.fetch()

    // don't send password and Mongoose versioning field
    data.message.forEach(user => user.password = user.__v = undefined)

    return res.status(status).json(data)
}

/**
 * Gets a single user from the database by its ID.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const getUserById = async (req, res) => {
    const { id } = req.params
    const { status, data } = await userService.fetchById(id)

    // don't send password and Mongoose versioning field
    data.message.password = data.message.__v = undefined

    return res.status(status).json(data)
}

/**
 * Creates a user in the database.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const postUser = async (req, res) => {
    // hash the password
    const temp = await authService.hashPassword(req.body.password)
    const authServiceStatus = temp.status
    const authServiceData = temp.data
    if (authServiceStatus !== 200) {
        return res.status(authServiceStatus).json(authServiceData)
    }
    const hashedPassword = authServiceData.context

    // cherry-pick fields from body (more secure)
    const { status, data } = await userService.create(
        req.body.name,
        req.body.username,
        hashedPassword,
        req.body.email
    )
    return res.status(status).json(data)
}

/**
 * Signs a user into the application.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const signIn = async (req, res) => {
    const { username, password } = req.body

    // authenticate user
    const temp = await authService.authenticate(username, password)
    const authServiceStatus = temp.status
    const authServiceData = temp.data
    if (authServiceStatus !== 200) {
        return res.status(authServiceStatus).json(authServiceData)
    }
    
    // sign them in
    const { status, data } = await userService.signIn(username)
    if (status === 200) {
        req.session.isAuth = true
        req.session.username = username
    }

    return res.status(status).json(data)
}

/**
 * Signs a user out of the application.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const signOut = async (req, res) => {
    const { username } = req.body
    const { status, data } = await userService.signOut(username)
    if (status === 200) req.session.destroy()
    return res.status(status).json(data)
}

/**
 * Updates a user in the database.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const putUser = async (req, res) => {
    // hash the password (if its included in the request body)
    let hashedPassword
    if (req.body.password) {
        const temp = await authService.hashPassword(req.body.password)
        const authServiceStatus = temp.status
        const authServiceData = temp.data
        if (authServiceStatus !== 200) {
            return res.status(authServiceStatus).json(authServiceData)
        }
        hashedPassword = authServiceData.context
    }

    // cherry-pick fields from body (more secure)
    const { status, data } = await userService.change(
        req.params.id,
        req.body.name,
        req.body.username,
        hashedPassword,
        req.body.email
    )
    if (status === 200) req.session.username = req.body.username

    return res.status(status).json(data)
}

/**
 * Deletes a user in the database.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const deleteUser = async (req, res) => {
    const { id } = req.params
    const { status, data } = await userService.discard(id)

    // drop current session
    if (status === 200) req.session.destroy()

    return res.status(status).json(data)
}

/**
 * Gets an image file from the database that is linked to
 * a user by its unique filename.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const getUserMedia = async (req, res) => {
    const { id, filename } = req.params
    const { status, data } = await mediaService.fetch(id, filename)

    if (status !== 200) return res.status(status).json(data)
    const file = data.message
    const type = filename.split('.')[1] === 'png' ? 'png' : 'jpeg'
    return res.set('Content-Type', `image/${type}`)
              .status(status)
              .send(file)
}

/**
 * Attaches an image to a user (only works when no media is
 * currently linked).
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const postUserMedia = async (req, res) => {
    const { id } = req.params

    // update user model with filenames
    const filename = req.files.cleared[0] ? req.files.cleared[0].unique : ''
    const temp = await userService.setMedia(id, filename)
    const userServiceStatus = temp.status
    const userServiceData = temp.data

    // only defer to the media service if user service call succeeds
    if (userServiceStatus !== 200) {
        return res.status(userServiceStatus).json(userServiceData)
    }

    // save the files to the disk
    const { status, data } = await mediaService.set(id, req.files)
    return res.status(status).json(data)
}

/**
 * Changes the image associated with a user,
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const putUserMedia = async (req, res) => {
    const { id } = req.params

    // update user model with filenames
    const filename = req.files.cleared[0] ? req.files.cleared[0].unique : ''
    const temp = await userService.resetMedia(id, filename)
    const userServiceStatus = temp.status
    const userServiceData = temp.data

    // only defer to the media service if user service call succeeds
    if (userServiceStatus !== 200) {
        return res.status(userServiceStatus).json(userServiceData)
    }

    // save the files to the disk
    const { status, data } = await mediaService.set(id, req.files, true)
    return res.status(status).json(data)
}

/**
 * Removes the image associated with a user,
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {object} req - Request object from Express.
 * @param {object} res - Response object from Express.
 */
const deleteUserMedia = async (req, res) => {
    const { id } = req.params

    // update user model with filenames
    const temp = await userService.unsetMedia(id)
    const userServiceStatus = temp.status
    const userServiceData = temp.data

    // only defer to the media service if user service call succeeds
    if (userServiceStatus !== 200) {
        return res.status(userServiceStatus).json(userServiceData)
    }

    // remove the files from the disk
    const { status, data } = await mediaService.unset(id)
    return res.status(status).json(data)
}

/**
 * Checks that the provided username is the username of
 * the provided user.
 * 
 * @author Mike Nystoriak <nystoriakm@gmail.com>
 * 
 * @param {string} id       - The user ID to check.
 * @param {string} username - The username.
 * 
 * @returns {number} The results of the operation.
 */
const checkUsername = async (id, username) => {
    return await userService.checkUsername(id, username)
}

module.exports = {
    getAllUsers,
    getUserById,
    postUser,
    signIn,
    signOut,
    putUser,
    deleteUser,
    getUserMedia,
    postUserMedia,
    putUserMedia,
    deleteUserMedia,
    checkUsername
}
const Joi = require('@hapi/joi');
const { password, objectId, mobile } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    mobile: Joi.string().required().custom(mobile),
    role: Joi.string().required(),
    organization: Joi.string().required(),
    status: Joi.string().valid('active', 'inactive'),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    role: Joi.string().valid('admin', 'manager', 'sales_executive'),
    organization: Joi.string().valid('KHUSHII', 'JWP', 'ANIMAL CARE', 'GREEN EARTH', 'EDUCATION FIRST'),
    status: Joi.string().valid('active', 'inactive'),
    search: Joi.string(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      email: Joi.string().email(),
      mobile: Joi.string().custom(mobile),
      role: Joi.string(),
      organization: Joi.string(),
      status: Joi.string(),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
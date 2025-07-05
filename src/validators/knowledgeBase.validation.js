const Joi = require('@hapi/joi');
const { objectId } = require('./custom.validation');

const createKnowledgeBase = {
  body: Joi.object().keys({
    title: Joi.string().min(5).max(200),
    content: Joi.array().items(Joi.string().min(10)).min(1).required(),
    summary: Joi.string().max(300).allow(''),
    organization: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    searchKeywords: Joi.array().items(Joi.string()),
    alternativeTitles: Joi.array().items(Joi.string()),
    featured: Joi.boolean(),
    cause: Joi.string().max(200),
    stage: Joi.string().max(100)
  })
};

const getKnowledgeBase = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    organization: Joi.string(),
    status: Joi.string(),
    featured: Joi.boolean(),
    search: Joi.string(),
    tags: Joi.string(),
    sortBy: Joi.string(),
    sortOrder: Joi.string()
  })
};

const getKnowledgeBaseEntry = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)
  })
};

const updateKnowledgeBase = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)
  }),
  body: Joi.object().keys({
    title: Joi.string().min(5).max(200),
    content: Joi.array().items(Joi.string().min(10)).min(1),
    summary: Joi.string().max(300).allow(''),
    organization: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    searchKeywords: Joi.array().items(Joi.string()),
    alternativeTitles: Joi.array().items(Joi.string()),
    status: Joi.string(),
    featured: Joi.boolean()
  }).min(1)
};

const searchKnowledgeBase = {
  query: Joi.object().keys({
    q: Joi.string(),
    organization: Joi.string(),
    tags: Joi.string(),
    limit: Joi.number().integer().min(1).max(50)
  })
};

const rateKnowledgeBase = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)
  }),
  body: Joi.object().keys({
    rating: Joi.number().min(1).max(5),
    comment: Joi.string().max(200),
    cause: Joi.string().max(200),
    stage: Joi.string().max(100)
  }).unknown(true)
};

module.exports = {
  createKnowledgeBase,
  getKnowledgeBase,
  getKnowledgeBaseEntry,
  updateKnowledgeBase,
  searchKnowledgeBase,
  rateKnowledgeBase
}; 
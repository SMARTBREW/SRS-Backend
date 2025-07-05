const Joi = require('@hapi/joi');
const { objectId } = require('./custom.validation');

const createQuery = {
  body: Joi.object().keys({
    title: Joi.string().min(5).max(200),
    organization: Joi.string(),
    cause: Joi.string().max(200),
    stage: Joi.string().max(100),
    tags: Joi.array().items(Joi.string())
  })
};

const getQueries = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    status: Joi.string(),
    organization: Joi.string(),
    submittedBy: Joi.string().custom(objectId),
    search: Joi.string(),
    sortBy: Joi.string(),
    sortOrder: Joi.string()
  })
};

const getQuery = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)
  })
};

const updateQuery = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)
  }),
  body: Joi.object().keys({
    title: Joi.string().min(5).max(200),
    organization: Joi.string(),
    cause: Joi.string().max(200),
    stage: Joi.string().max(100),
    tags: Joi.array().items(Joi.string()),
    status: Joi.string()
  }).min(1)
};

const addAnswer = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)
  }),
  body: Joi.object().keys({
    content: Joi.string().max(5000),
    helpful: Joi.boolean(),
    managerNotes: Joi.string().max(1000)
  })
};

const provideSolution = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)
  }),
  body: Joi.object().keys({
    content: Joi.string().max(5000),
    managerNotes: Joi.string().max(1000)
  })
};

const reviewSolution = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)
  }),
  body: Joi.object().keys({
    action: Joi.string().valid('approve', 'reject').required(),
    editedSolution: Joi.string().max(5000),
    adminNotes: Joi.string().max(1000),
    rejectionReason: Joi.string().max(500),
    // Knowledge base fields (optional for approve action)
    knowledgeBaseTitle: Joi.string().max(200),
    summary: Joi.string().max(1000),
    tags: Joi.array().items(Joi.string()),
    searchKeywords: Joi.array().items(Joi.string()),
    alternativeTitles: Joi.array().items(Joi.string())
  })
};

const addComment = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId)
  }),
  body: Joi.object().keys({
    message: Joi.string().max(1000),
    type: Joi.string().default('comment')
  })
};

module.exports = {
  createQuery,
  getQueries,
  getQuery,
  updateQuery,
  addAnswer,
  provideSolution,
  reviewSolution,
  addComment
}; 
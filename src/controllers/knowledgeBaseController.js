const httpStatus = require('http-status');
const KnowledgeBase = require('../models/KnowledgeBase');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const createKnowledgeBaseEntry = catchAsync(async (req, res) => {
  const {
    title,
    content,
    summary,
    organization,
    tags,
    searchKeywords,
    alternativeTitles,
    featured,
    cause,
    stage
  } = req.body;

  const entry = await KnowledgeBase.create({
    title,
    content,
    summary,
    organization,
    tags,
    searchKeywords,
    alternativeTitles,
    featured,
    cause,
    stage,
    createdBy: req.user.id,
    lastUpdatedBy: req.user.id
  });

  await entry.populate('createdBy', 'name email role');

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Knowledge base entry created successfully',
    data: { entry }
  });
});

const getAllKnowledgeBase = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    organization,
    status,
    featured,
    search,
    tags,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const query = {};

  if (organization && organization !== 'ALL') {
    query.organization = { $in: [organization, 'ALL'] };
  }
  if (status) query.status = status;
  if (featured !== undefined) query.featured = featured === 'true';
  if (tags) {
    const tagArray = tags.split(',');
    query.tags = { $in: tagArray };
  }

  if (search) {
    query.$text = { $search: search };
  }

  const sortObj = {};
  if (search) {
    sortObj.score = { $meta: 'textScore' };
  } else {
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
  }

  const entries = await KnowledgeBase.find(query)
    .populate('createdBy', 'name email role')
    .populate('lastUpdatedBy', 'name email role')
    .populate('workflow.solutionProvider', 'name email role')
    .populate('workflow.approvedBy', 'name email role')
    .sort(sortObj)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await KnowledgeBase.countDocuments(query);

  res.json({
    success: true,
    data: {
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

const getKnowledgeBaseById = catchAsync(async (req, res) => {
  const entry = await KnowledgeBase.findById(req.params.id)
    .populate('createdBy', 'name email role organization')
    .populate('lastUpdatedBy', 'name email role')
    .populate('workflow.sourceQuery')
    .populate('workflow.solutionProvider', 'name email role')
    .populate('workflow.approvedBy', 'name email role')
    .populate('ratings.user', 'name email role');

  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Knowledge base entry not found');
  }

  // Increment view count and update last accessed
  entry.metrics.views += 1;
  entry.metrics.lastAccessed = new Date();
  await entry.save();

  res.json({
    success: true,
    data: { entry }
  });
});

const updateKnowledgeBase = catchAsync(async (req, res) => {
  const {
    title,
    content,
    summary,
    organization,
    tags,
    searchKeywords,
    alternativeTitles,
    status,
    featured,
    cause,
    stage
  } = req.body;

  const entry = await KnowledgeBase.findById(req.params.id);

  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Knowledge base entry not found');
  }

  // Check permissions
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions to update knowledge base');
  }

  const updatedEntry = await KnowledgeBase.findByIdAndUpdate(
    req.params.id,
    {
      title,
      content,
      summary,
      organization,
      tags,
      searchKeywords,
      alternativeTitles,
      status,
      featured,
      cause,
      stage,
      lastUpdatedBy: req.user.id,
      $inc: { version: 1 }
    },
    { new: true, runValidators: true }
  ).populate('createdBy lastUpdatedBy', 'name email role');

  res.json({
    success: true,
    message: 'Knowledge base entry updated successfully',
    data: { entry: updatedEntry }
  });
});

const deleteKnowledgeBase = catchAsync(async (req, res) => {
  const entry = await KnowledgeBase.findById(req.params.id);

  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Knowledge base entry not found');
  }

  // Check permissions
  if (req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can delete knowledge base entries');
  }

  await KnowledgeBase.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Knowledge base entry deleted successfully'
  });
});

const searchKnowledgeBase = catchAsync(async (req, res) => {
  const { q, organization, tags, limit = 20 } = req.query;

  const query = {
    status: 'published'
  };

  // Use regex for partial matching if q is provided
  if (q && q.trim()) {
    const regex = new RegExp(q, 'i');
    query.$or = [
      { title: regex },
      { summary: regex },
      { tags: { $elemMatch: regex } },
      { searchKeywords: { $elemMatch: regex } }
    ];
  }

  if (organization && organization !== 'ALL') {
    query.organization = { $in: [organization, 'ALL'] };
  }

  if (tags) {
    const tagArray = tags.split(',');
    query.tags = { $in: tagArray };
  }

  const sortOptions = q && q.trim() 
    ? { 'metrics.views': -1, createdAt: -1 }
    : { 'metrics.views': -1, createdAt: -1 };

  const entries = await KnowledgeBase.find(query)
    .select('title summary tags organization metrics.views createdAt')
    .populate('createdBy', 'name role')
    .sort(sortOptions)
    .limit(parseInt(limit));

  // Increment search count for found entries
  const entryIds = entries.map(entry => entry._id);
  await KnowledgeBase.updateMany(
    { _id: { $in: entryIds } },
    { $inc: { 'metrics.searches': 1 } }
  );

  res.json({
    success: true,
    data: {
      results: entries,
      query: q || '',
      count: entries.length
    }
  });
});

const rateKnowledgeBase = catchAsync(async (req, res) => {
  const { rating, comment } = req.body;

  // Only validate rating if it's provided
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Rating must be between 1 and 5');
  }

  const entry = await KnowledgeBase.findById(req.params.id);

  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Knowledge base entry not found');
  }

  // Only proceed if rating is provided
  if (rating !== undefined) {
    // Check if user already rated
    const existingRatingIndex = entry.ratings.findIndex(
      r => r.user.toString() === req.user.id
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      entry.ratings[existingRatingIndex] = {
        user: req.user.id,
        rating,
        comment,
        createdAt: new Date()
      };
    } else {
      // Add new rating
      entry.ratings.push({
        user: req.user.id,
        rating,
        comment,
        createdAt: new Date()
      });
    }

    await entry.save();
  }

  res.json({
    success: true,
    message: rating !== undefined ? 'Rating submitted successfully' : 'Request processed successfully',
    data: { entry }
  });
});

const markHelpful = catchAsync(async (req, res) => {
  const { helpful } = req.body; // true for helpful, false for not helpful

  const entry = await KnowledgeBase.findByIdAndUpdate(
    req.params.id,
    {
      $inc: helpful 
        ? { 'metrics.helpful': 1 }
        : { 'metrics.notHelpful': 1 }
    },
    { new: true }
  );

  if (!entry) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Knowledge base entry not found');
  }

  res.json({
    success: true,
    message: 'Feedback recorded successfully',
    data: { metrics: entry.metrics }
  });
});

const getFeaturedEntries = catchAsync(async (req, res) => {
  const { organization, limit = 5 } = req.query;

  const query = {
    status: 'published',
    featured: true
  };

  if (organization && organization !== 'ALL') {
    query.organization = { $in: [organization, 'ALL'] };
  }

  const entries = await KnowledgeBase.find(query)
    .select('title summary tags organization metrics.views createdAt')
    .populate('createdBy', 'name role')
    .sort({ 'metrics.views': -1, createdAt: -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: { entries }
  });
});

const getPopularEntries = catchAsync(async (req, res) => {
  const { organization, limit = 10, timeframe = '30' } = req.query;

  const query = { status: 'published' };

  if (organization && organization !== 'ALL') {
    query.organization = { $in: [organization, 'ALL'] };
  }

  // Filter by timeframe if needed
  if (timeframe !== 'all') {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeframe));
    query.createdAt = { $gte: daysAgo };
  }

  const entries = await KnowledgeBase.find(query)
    .select('title summary tags organization metrics createdAt')
    .populate('createdBy', 'name role')
    .sort({ 'metrics.views': -1, 'metrics.helpful': -1 })
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: { entries }
  });
});

const getKnowledgeBaseStats = catchAsync(async (req, res) => {
  const stats = await KnowledgeBase.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
        draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
        archived: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
        featured: { $sum: { $cond: ['$featured', 1, 0] } },
        totalViews: { $sum: '$metrics.views' },
        totalRatings: { $sum: { $size: '$ratings' } }
      }
    }
  ]);

  const organizationStats = await KnowledgeBase.aggregate([
    {
      $group: {
        _id: '$organization',
        count: { $sum: 1 },
        views: { $sum: '$metrics.views' }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      overall: stats[0] || {},
      byOrganization: organizationStats
    }
  });
});

module.exports = {
  createKnowledgeBaseEntry,
  getAllKnowledgeBase,
  getKnowledgeBaseById,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  searchKnowledgeBase,
  rateKnowledgeBase,
  markHelpful,
  getFeaturedEntries,
  getPopularEntries,
  getKnowledgeBaseStats
}; 
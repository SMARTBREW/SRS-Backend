const httpStatus = require('http-status');
const Query = require('../models/Query');
const KnowledgeBase = require('../models/KnowledgeBase');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const createQuery = catchAsync(async (req, res) => {
  const { title, organization, cause, stage, tags, solution } = req.body;

  // If admin and solution is provided, create KnowledgeBase entry directly
  if (req.user.role === 'admin' && solution && solution.content) {
    const knowledgeBaseEntry = await KnowledgeBase.create({
      title,
      content: solution.content,
      summary: `Solution for: ${title}`,
      organization,
      tags: tags || [],
      cause,
      stage,
      workflow: {
        solutionProvider: req.user.id,
        approvedBy: req.user.id,
        approvalDate: new Date(),
        adminEdits: solution.managerNotes || '',
        wasEdited: false,
        publishedAt: new Date()
      },
      createdBy: req.user.id
    });
    await knowledgeBaseEntry.populate('createdBy', 'name email role');
    return res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Knowledge base entry created successfully (admin shortcut)',
      data: { knowledgeBaseEntry }
    });
  }

  // Default: create a query as usual
  const query = await Query.create({
    title,
    organization,
    cause,
    stage,
    tags,
    submittedBy: req.user.id
  });

  await query.populate('submittedBy', 'name email role');

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Query submitted successfully',
    data: { query }
  });
});

const getAllQueries = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    organization, 
    submittedBy,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const query = {};
  
  if (status) query.status = status;
  if (organization) query.organization = organization;
  if (submittedBy) query.submittedBy = submittedBy;
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { cause: { $regex: search, $options: 'i' } },
      { stage: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  const sortObj = {};
  sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const queries = await Query.find(query)
    .populate('submittedBy', 'name email role')
    .populate('answers.providedBy', 'name email role')
    .populate('solution.providedBy', 'name email role')
    .populate('adminReview.reviewedBy', 'name email role')
    .sort(sortObj)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Query.countDocuments(query);

  res.json({
    success: true,
    data: {
      queries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

const getQueryById = catchAsync(async (req, res) => {
  const query = await Query.findById(req.params.id)
    .populate('submittedBy', 'name email role organization')
    .populate('answers.providedBy', 'name email role')
    .populate('solution.providedBy', 'name email role')
    .populate('adminReview.reviewedBy', 'name email role')
    .populate('knowledgeBaseEntry')
    .populate('comments.user', 'name email role');

  if (!query) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Query not found');
  }

  // Increment view count
  query.views += 1;
  await query.save();

  res.json({
    success: true,
    data: { query }
  });
});

const updateQuery = catchAsync(async (req, res) => {
  const { title, organization, cause, stage, tags, status } = req.body;

  const query = await Query.findById(req.params.id);
  
  if (!query) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Query not found');
  }

  // Check permissions
  if (req.user.role === 'sales_executive' && query.submittedBy.toString() !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only update your own queries');
  }

  const updatedQuery = await Query.findByIdAndUpdate(
    req.params.id,
    { title, organization, cause, stage, tags, status },
    { new: true, runValidators: true }
  ).populate('submittedBy', 'name email role');

  res.json({
    success: true,
    message: 'Query updated successfully',
    data: { query: updatedQuery }
  });
});

const deleteQuery = catchAsync(async (req, res) => {
  const query = await Query.findById(req.params.id);
  
  if (!query) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Query not found');
  }

  // Check permissions
  if (req.user.role === 'sales_executive' && query.submittedBy.toString() !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own queries');
  }

  await Query.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Query deleted successfully'
  });
});

const addAnswer = catchAsync(async (req, res) => {
  const { content, helpful, managerNotes } = req.body;

  const query = await Query.findById(req.params.id);
  
  if (!query) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Query not found');
  }

  const answer = {
    content,
    providedBy: req.user.id,
    providedAt: new Date(),
    helpful,
    managerNotes
  };

  query.answers.push(answer);
  query.actionCounts.answers += 1;

  // Update status if first answer
  if (query.status === 'new' || query.status === 'assigned') {
    query.status = 'under_discussion';
  }

  await query.save();
  await query.populate('answers.providedBy', 'name email role');

  res.json({
    success: true,
    message: 'Answer added successfully',
    data: { query }
  });
});

const provideSolution = catchAsync(async (req, res) => {
  const { content, managerNotes } = req.body;

  const query = await Query.findById(req.params.id);
  
  if (!query) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Query not found');
  }

  query.solution = {
    content,
    providedBy: req.user.id,
    providedAt: new Date(),
    managerNotes
  };

  query.status = 'solution_provided';
  query.workflow.currentStage = 'admin_review';
  query.workflow.stageStartedAt = new Date();

  await query.save();
  await query.populate('solution.providedBy', 'name email role');

  res.json({
    success: true,
    message: 'Solution provided successfully',
    data: { query }
  });
});

const reviewSolution = catchAsync(async (req, res) => {
  const { 
    action, // 'approve' or 'reject'
    editedSolution, 
    adminNotes, 
    rejectionReason,
    // Knowledge base fields (optional for approve action)
    knowledgeBaseTitle,
    summary,
    tags,
    searchKeywords,
    alternativeTitles
  } = req.body;

  const query = await Query.findById(req.params.id);
  
  if (!query) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Query not found');
  }

  // Check if there's content to review (either solution or answers)
  const hasContent = (query.solution && query.solution.content) || 
                    (query.answers && query.answers.length > 0);
  
  if (!hasContent) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No solution or answers provided for this query');
  }

  // Store original content if this is the first admin action
  if (!query.adminReview) {
    query.adminReview = {
      originalSolution: query.solution?.content || null,
      originalAnswers: query.answers?.map(a => ({ content: a.content, providedBy: a.providedBy })) || []
    };
  }

  // Update admin review info
  query.adminReview = {
    ...query.adminReview,
    reviewedBy: req.user.id,
    reviewedAt: new Date(),
    action,
    adminNotes,
    rejectionReason
  };

  if (action === 'approve') {
    // Determine the content to approve
    let finalContent;
    let solutionProvider;
    
    if (editedSolution && editedSolution.trim() !== '') {
      // Manager/Admin provided a custom solution
      finalContent = editedSolution;
      solutionProvider = req.user.id;
      query.adminReview.wasEdited = true;
      
      // Create or update the solution
      query.solution = {
        content: finalContent,
        providedBy: req.user.id,
        providedAt: new Date(),
        managerNotes: adminNotes
      };
    } else if (query.solution && query.solution.content) {
      // Use existing solution
      finalContent = query.solution.content;
      solutionProvider = query.solution.providedBy;
    } else if (query.answers && query.answers.length > 0) {
      // Use the best answer as the solution
      const bestAnswer = query.answers[0]; // You could add logic to pick the best one
      finalContent = bestAnswer.content;
      solutionProvider = bestAnswer.providedBy;
      
      // Convert the answer to a solution
      query.solution = {
        content: finalContent,
        providedBy: bestAnswer.providedBy,
        providedAt: new Date(),
        managerNotes: `Approved answer from ${bestAnswer.providedBy}`
      };
    }
    
    query.status = 'approved';
    query.workflow.currentStage = 'completed';

    // Automatically create knowledge base entry when approving
    const knowledgeBaseEntry = await KnowledgeBase.create({
      title: knowledgeBaseTitle || query.title || 'Untitled',
      content: finalContent,
      summary: summary || `Solution for: ${query.title}`,
      organization: query.organization,
      tags: tags || query.tags || [],
      searchKeywords: searchKeywords || [],
      alternativeTitles: alternativeTitles || [],
      workflow: {
        sourceQuery: query._id,
        solutionProvider: solutionProvider,
        originalSolution: query.adminReview?.originalSolution,
        originalAnswers: query.adminReview?.originalAnswers,
        approvedBy: req.user.id,
        approvalDate: new Date(),
        adminEdits: adminNotes,
        wasEdited: query.adminReview?.wasEdited || false,
        publishedAt: new Date()
      },
      createdBy: req.user.id
    });

    // Link the knowledge base entry to the query
    query.knowledgeBaseEntry = knowledgeBaseEntry._id;
    query.status = 'published';
    
  } else if (action === 'reject') {
    query.status = 'rejected';
    query.workflow.currentStage = 'rejected';
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Action must be either "approve" or "reject"');
  }

  await query.save();
  await query.populate('adminReview.reviewedBy', 'name email role');
  await query.populate('solution.providedBy', 'name email role');
  await query.populate('knowledgeBaseEntry');

  const responseData = { query };
  
  // Include knowledge base entry in response if created
  if (action === 'approve' && query.knowledgeBaseEntry) {
    responseData.knowledgeBaseEntry = query.knowledgeBaseEntry;
  }

  res.json({
    success: true,
    message: action === 'approve' 
      ? 'Solution approved and published to knowledge base successfully'
      : 'Solution rejected successfully',
    data: responseData
  });
});

const addComment = catchAsync(async (req, res) => {
  const { message, type = 'comment' } = req.body;

  const query = await Query.findById(req.params.id);
  
  if (!query) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Query not found');
  }

  const comment = {
    user: req.user.id,
    message,
    type,
    createdAt: new Date()
  };

  query.comments.push(comment);
  query.actionCounts.comments += 1;

  await query.save();
  await query.populate('comments.user', 'name email role');

  res.json({
    success: true,
    message: 'Comment added successfully',
    data: { query }
  });
});

const getQueryStats = catchAsync(async (req, res) => {
  const stats = await Query.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
        underDiscussion: { $sum: { $cond: [{ $eq: ['$status', 'under_discussion'] }, 1, 0] } },
        solutionProvided: { $sum: { $cond: [{ $eq: ['$status', 'solution_provided'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } }
      }
    }
  ]);

  const organizationStats = await Query.aggregate([
    {
      $group: {
        _id: '$organization',
        count: { $sum: 1 }
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
  createQuery,
  getAllQueries,
  getQueryById,
  updateQuery,
  deleteQuery,
  addAnswer,
  provideSolution,
  reviewSolution,
  addComment,
  getQueryStats
};
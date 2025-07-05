const mongoose = require("mongoose");

const querySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    organization: {
      type: String,
      // enum: ["KHUSHII", "JWP", "ANIMAL CARE", "GREEN EARTH", "EDUCATION FIRST"],
    },
    cause: {
      type: String,
      trim: true,
      maxlength: [200, "Cause cannot exceed 200 characters"],
    },
    stage: {
      type: String,
      trim: true,
      maxlength: [100, "Stage cannot exceed 100 characters"],
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      // enum: [
      //   "new",
      //   "assigned",
      //   "under_discussion",
      //   "solution_provided",
      //   "pending_review",
      //   "approved",
      //   "rejected",
      //   "published",
      //   "archived",
      // ],
      default: "new",
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    answers: [
      {
        content: {
          type: String,
          trim: true,
          maxlength: [5000, "Answer cannot exceed 5000 characters"],
        },
        providedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        providedAt: {
          type: Date,
        },
        helpful: {
          type: Boolean,
        },
        managerNotes: {
          type: String,
          maxlength: [1000, "Manager notes cannot exceed 1000 characters"],
        },
      },
    ],
    solution: {
      content: {
        type: String,
        trim: true,
        maxlength: [5000, "Solution cannot exceed 5000 characters"],
      },
      providedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      providedAt: {
        type: Date,
      },
      managerNotes: {
        type: String,
        maxlength: [1000, "Manager notes cannot exceed 1000 characters"],
      },
    },
    adminReview: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: {
        type: Date,
      },
      status: {
        type: String,
        // enum: ["pending", "in_review", "approved", "rejected"],
        default: "pending",
      },
      originalSolution: {
        type: String,
      },
      editedSolution: {
        type: String,
      },
      adminFeedback: {
        type: String,
        maxlength: [500, "Admin feedback cannot exceed 500 characters"],
      },
      approvalReason: {
        type: String,
        maxlength: [300, "Approval reason cannot exceed 300 characters"],
      },
      rejectionReason: {
        type: String,
        maxlength: [300, "Rejection reason cannot exceed 300 characters"],
      },
      changesLog: [
        {
          field: String,
          oldValue: String,
          newValue: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    knowledgeBaseEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeBase",
    },
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        message: {
          type: String,
          maxlength: [1000, "Comment cannot exceed 1000 characters"],
        },
        type: {
          type: String,
          // enum: ["comment", "solution", "review", "approval", "rejection"],
          default: "comment",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    workflow: {
      currentStage: {
        type: String,
        // enum: ["manager_review", "admin_review", "completed"],
        default: "manager_review",
      },
      stageStartedAt: {
        type: Date,
        default: Date.now,
      },
      estimatedCompletion: {
        type: Date,
      },
    },
    views: {
      type: Number,
      default: 0,
    },
    timeTracking: {
      managerResponseTime: Number,
      adminReviewTime: Number,
      totalResolutionTime: Number,
    },
    actionCounts: {
      comments: { type: Number, default: 0 },
      answers: { type: Number, default: 0 },
      adminReviews: { type: Number, default: 0 },
      reassignments: { type: Number, default: 0 },
    },
    history: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

querySchema.index({ organization: 1, status: 1 });
querySchema.index({ submittedBy: 1, createdAt: -1 });
querySchema.index({ assignedManager: 1, status: 1 });
querySchema.index({ "adminReview.status": 1, createdAt: -1 });
querySchema.index({ priority: 1, createdAt: -1 });
querySchema.index({ "workflow.currentStage": 1 });

module.exports = mongoose.model("Query", querySchema);

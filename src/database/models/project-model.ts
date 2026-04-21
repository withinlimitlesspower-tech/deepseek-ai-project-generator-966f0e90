import mongoose, { Schema, Document, Model } from 'mongoose';
import { IProject, ProjectStatus, ProjectPriority } from '../../types/project.types';

// Define the Project document interface extending mongoose Document
export interface IProjectDocument extends IProject, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Define the Project model interface
export interface IProjectModel extends Model<IProjectDocument> {
  findByStatus(status: ProjectStatus): Promise<IProjectDocument[]>;
  findByPriority(priority: ProjectPriority): Promise<IProjectDocument[]>;
  findActiveProjects(): Promise<IProjectDocument[]>;
  findProjectsByUser(userId: string): Promise<IProjectDocument[]>;
  softDelete(projectId: string): Promise<IProjectDocument | null>;
}

// Define the Project schema
const ProjectSchema = new Schema<IProjectDocument, IProjectModel>(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: [3, 'Project title must be at least 3 characters'],
      maxlength: [200, 'Project title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
      minlength: [10, 'Project description must be at least 10 characters'],
      maxlength: [5000, 'Project description cannot exceed 5000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.PLANNING,
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(ProjectPriority),
      default: ProjectPriority.MEDIUM,
      required: true,
    },
    technologies: {
      type: [String],
      default: [],
      validate: {
        validator: function (techs: string[]) {
          return techs.length <= 20;
        },
        message: 'Cannot have more than 20 technologies',
      },
    },
    features: {
      type: [String],
      default: [],
      validate: {
        validator: function (features: string[]) {
          return features.length <= 50;
        },
        message: 'Cannot have more than 50 features',
      },
    },
    estimatedHours: {
      type: Number,
      min: [1, 'Estimated hours must be at least 1'],
      max: [10000, 'Estimated hours cannot exceed 10000'],
      default: 10,
    },
    actualHours: {
      type: Number,
      min: [0, 'Actual hours cannot be negative'],
      max: [20000, 'Actual hours cannot exceed 20000'],
      default: 0,
    },
    progress: {
      type: Number,
      min: [0, 'Progress cannot be less than 0%'],
      max: [100, 'Progress cannot exceed 100%'],
      default: 0,
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    blueprint: {
      type: Schema.Types.Mixed,
      default: null,
    },
    generatedFiles: {
      type: [String],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.isDeleted;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.isDeleted;
        return ret;
      },
    },
  }
);

// Indexes for better query performance
ProjectSchema.index({ status: 1, createdAt: -1 });
ProjectSchema.index({ priority: 1, createdAt: -1 });
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ title: 'text', description: 'text' });

// Virtual for project age in days
ProjectSchema.virtual('ageInDays').get(function (this: IProjectDocument) {
  const now = new Date();
  const created = this.createdAt;
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for remaining hours
ProjectSchema.virtual('remainingHours').get(function (this: IProjectDocument) {
  return Math.max(0, this.estimatedHours - this.actualHours);
});

// Virtual for efficiency percentage
ProjectSchema.virtual('efficiency').get(function (this: IProjectDocument) {
  if (this.actualHours === 0) return 100;
  const efficiency = (this.progress / this.actualHours) * 100;
  return Math.min(100, Math.max(0, Math.round(efficiency * 100) / 100));
});

// Static method to find projects by status
ProjectSchema.statics.findByStatus = async function (
  status: ProjectStatus
): Promise<IProjectDocument[]> {
  try {
    return await this.find({ status, isDeleted: false }).sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(`Error finding projects by status: ${error.message}`);
  }
};

// Static method to find projects by priority
ProjectSchema.statics.findByPriority = async function (
  priority: ProjectPriority
): Promise<IProjectDocument[]> {
  try {
    return await this.find({ priority, isDeleted: false }).sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(`Error finding projects by priority: ${error.message}`);
  }
};

// Static method to find active projects (not deleted)
ProjectSchema.statics.findActiveProjects = async function (): Promise<IProjectDocument[]> {
  try {
    return await this.find({ isDeleted: false }).sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(`Error finding active projects: ${error.message}`);
  }
};

// Static method to find projects by user
ProjectSchema.statics.findProjectsByUser = async function (
  userId: string
): Promise<IProjectDocument[]> {
  try {
    return await this.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(`Error finding projects by user: ${error.message}`);
  }
};

// Static method for soft delete
ProjectSchema.statics.softDelete = async function (
  projectId: string
): Promise<IProjectDocument | null> {
  try {
    return await this.findByIdAndUpdate(
      projectId,
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: ProjectStatus.CANCELLED,
      },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Error soft deleting project: ${error.message}`);
  }
};

// Middleware to validate data before save
ProjectSchema.pre('save', function (next) {
  const project = this as IProjectDocument;

  // Validate progress doesn't exceed 100%
  if (project.progress > 100) {
    project.progress = 100;
  }

  // Validate actual hours don't exceed estimated hours by more than 50%
  if (project.actualHours > project.estimatedHours * 1.5) {
    throw new Error('Actual hours exceed estimated hours by more than 50%');
  }

  // Auto-update status based on progress
  if (project.progress === 100 && project.status !== ProjectStatus.COMPLETED) {
    project.status = ProjectStatus.COMPLETED;
  } else if (project.progress > 0 && project.progress < 100 && project.status === ProjectStatus.PLANNING) {
    project.status = ProjectStatus.IN_PROGRESS;
  }

  next();
});

// Middleware to exclude deleted projects from queries by default
ProjectSchema.pre(/^find/, function (next) {
  const query = this as any;
  if (!query._conditions.isDeleted) {
    query.where({ isDeleted: false });
  }
  next();
});

// Create and export the Project model
export const ProjectModel = mongoose.model<IProjectDocument, IProjectModel>('Project', ProjectSchema);

// Export default for convenience
export default ProjectModel;
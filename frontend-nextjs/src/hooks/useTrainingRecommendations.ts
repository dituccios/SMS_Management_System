import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';

export interface TrainingRecommendation {
  id: string;
  userId: string;
  contentId: string;
  type: 'SKILL_GAP' | 'CAREER_DEVELOPMENT' | 'COMPLIANCE' | 'TRENDING' | 'PEER_RECOMMENDED' | 'MANAGER_ASSIGNED';
  score: number;
  confidence: number;
  reasoning: {
    primaryFactors: string[];
    skillGaps: string[];
    careerGoals: string[];
    explanation: string;
  };
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  title?: string;
  estimatedBenefit: string;
  timeToComplete: number;
  prerequisites: string[];
  alternatives: string[];
  generatedAt: Date;
  expiresAt: Date;
  status: 'PENDING' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'EXPIRED';
  feedback?: any;
}

export interface PersonalizedLearningPath {
  id: string;
  userId: string;
  name: string;
  description: string;
  objective: string;
  targetSkills: string[];
  estimatedDuration: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'MIXED';
  courses: any[];
  milestones: any[];
  adaptiveRules: any[];
  progress: {
    overallProgress: number;
    coursesCompleted: number;
    totalCourses: number;
    hoursCompleted: number;
    totalHours: number;
    skillsAcquired: string[];
    milestonesAchieved: number;
    currentCourse: string;
    estimatedCompletion: Date;
    lastActivity: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
}

export interface UserProfile {
  userId: string;
  demographics: {
    role: string;
    department: string;
    seniority: string;
    location: string;
    timezone: string;
    language: string;
    experience: number;
  };
  preferences: {
    learningStyles: string[];
    contentTypes: string[];
    difficulty: string;
    duration: string;
    schedule: string;
    delivery: string;
    topics: string[];
    excludedTopics: string[];
  };
  skillProfile: {
    currentSkills: any[];
    targetSkills: any[];
    skillGaps: any[];
    competencyLevel: any;
    certifications: any[];
    assessmentResults: any[];
  };
  learningHistory: {
    completedCourses: any[];
    inProgressCourses: any[];
    learningPaths: any[];
    totalHours: number;
    averageRating: number;
    preferredInstructors: string[];
    learningPatterns: any[];
  };
  behaviorProfile: {
    engagementLevel: number;
    motivationFactors: string[];
    learningVelocity: number;
    dropoutRisk: number;
    socialLearning: boolean;
    competitiveness: number;
    selfDirected: boolean;
    feedbackSeeking: boolean;
  };
  contextualFactors: {
    currentProjects: string[];
    upcomingDeadlines: Date[];
    workload: string;
    availability: number;
    budget: number;
    managerSupport: boolean;
    teamLearning: boolean;
    complianceRequirements: string[];
  };
  lastUpdated: Date;
}

export interface SkillGapAnalysis {
  userId: string;
  analysisDate: Date;
  skillGaps: any[];
  prioritizedGaps: any[];
  recommendations: any[];
  overallGapScore: number;
  criticalGaps: number;
  timeToClose: number;
}

export interface LearningHistoryTracking {
  userId: string;
  trackingPeriod: {
    start: Date;
    end: Date;
  };
  activities: any[];
  patterns: any[];
  preferences: any;
  performance: {
    averageScore: number;
    completionRate: number;
    retentionRate: number;
    improvementRate: number;
    consistencyScore: number;
    efficiencyScore: number;
    qualityScore: number;
    trendsOverTime: any[];
  };
  engagement: any;
  insights: any[];
}

export interface TrainingContent {
  contentId: string;
  title: string;
  description: string;
  type: string;
  category: string;
  subcategory: string;
  tags: string[];
  skills: string[];
  difficulty: string;
  duration: number;
  format: string;
  language: string;
  provider: string;
  instructor: string;
  rating: number;
  reviewCount: number;
  popularity: number;
  recency: Date;
  cost: number;
  prerequisites: string[];
  learningObjectives: string[];
  metadata: any;
}

export const useTrainingRecommendations = () => {
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [learningPaths, setLearningPaths] = useState<PersonalizedLearningPath[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [skillGapAnalysis, setSkillGapAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [learningHistory, setLearningHistory] = useState<LearningHistoryTracking | null>(null);
  const [trainingContent, setTrainingContent] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get Training Recommendations
  const getRecommendations = useCallback(async (engineId?: string, limit: number = 10) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (engineId) params.append('engineId', engineId);
      params.append('limit', limit.toString());

      const response = await apiClient.get(`/training/recommendations?${params}`);
      const recs = response.data.data;
      
      setRecommendations(recs);
      
      return recs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get training recommendations';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Personalized Learning Path
  const generateLearningPath = useCallback(async (
    objective: string,
    targetSkills: string[],
    constraints?: any
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/training/learning-paths', {
        objective,
        targetSkills,
        constraints
      });
      
      const learningPath = response.data.data;
      
      setLearningPaths(prev => [learningPath, ...prev]);
      
      return learningPath;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate learning path';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Learning Paths
  const getLearningPaths = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/training/learning-paths');
      const paths = response.data.data;
      
      setLearningPaths(paths);
      
      return paths;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get learning paths';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get User Profile
  const getUserProfile = useCallback(async (userId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = userId ? `/users/${userId}/profile` : '/users/profile';
      const response = await apiClient.get(endpoint);
      const profile = response.data.data;
      
      setUserProfile(profile);
      
      return profile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user profile';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update User Profile
  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put('/users/profile', updates);
      const updatedProfile = response.data.data;
      
      setUserProfile(updatedProfile);
      
      return updatedProfile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user profile';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Perform Skill Gap Analysis
  const performSkillGapAnalysis = useCallback(async (userId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = userId ? `/users/${userId}/skill-gap-analysis` : '/users/skill-gap-analysis';
      const response = await apiClient.post(endpoint);
      const analysis = response.data.data;
      
      setSkillGapAnalysis(analysis);
      
      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform skill gap analysis';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Learning History
  const getLearningHistory = useCallback(async (
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const endpoint = userId ? `/users/${userId}/learning-history` : '/users/learning-history';
      const response = await apiClient.get(`${endpoint}?${params}`);
      const history = response.data.data;
      
      setLearningHistory(history);
      
      return history;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get learning history';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Track Learning Activity
  const trackLearningActivity = useCallback(async (activity: {
    activityId: string;
    type: string;
    contentId: string;
    contentTitle: string;
    timestamp: Date;
    duration: number;
    score?: number;
    rating?: number;
    feedback?: string;
    context: any;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/training/activities', activity);
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track learning activity';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update Recommendation Feedback
  const updateRecommendationFeedback = useCallback(async (
    recommendationId: string,
    feedback: {
      rating: number;
      relevance: number;
      timing: number;
      quality: number;
      comments?: string;
      action: string;
      submittedAt: Date;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put(`/training/recommendations/${recommendationId}/feedback`, feedback);

      // Update local state
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, feedback }
            : rec
        )
      );

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update recommendation feedback';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add Training Content
  const addTrainingContent = useCallback(async (content: Omit<TrainingContent, 'contentId'>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/training/content', content);
      const contentId = response.data.data.contentId;

      // Refresh content list
      await getTrainingContent();

      return contentId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add training content';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get Training Content
  const getTrainingContent = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value as string);
        });
      }

      const response = await apiClient.get(`/training/content?${params}`);
      const content = response.data.data;
      
      setTrainingContent(content);
      
      return content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get training content';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update Learning Path Progress
  const updateLearningPathProgress = useCallback(async (
    pathId: string,
    progress: any
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put(`/training/learning-paths/${pathId}/progress`, progress);

      // Update local state
      setLearningPaths(prev => 
        prev.map(path => 
          path.id === pathId 
            ? { ...path, progress: { ...path.progress, ...progress } }
            : path
        )
      );

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update learning path progress';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Utility Functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      await Promise.all([
        getRecommendations(),
        getLearningPaths(),
        getUserProfile(),
        performSkillGapAnalysis(),
        getLearningHistory()
      ]);
    } catch (error) {
      console.error('Failed to refresh all training data:', error);
    }
  }, [getRecommendations, getLearningPaths, getUserProfile, performSkillGapAnalysis, getLearningHistory]);

  // Status Helpers
  const getRecommendationStats = useCallback(() => {
    if (!recommendations || recommendations.length === 0) return null;

    return {
      total: recommendations.length,
      byType: {
        skillGap: recommendations.filter(r => r.type === 'SKILL_GAP').length,
        career: recommendations.filter(r => r.type === 'CAREER_DEVELOPMENT').length,
        compliance: recommendations.filter(r => r.type === 'COMPLIANCE').length,
        trending: recommendations.filter(r => r.type === 'TRENDING').length,
        peer: recommendations.filter(r => r.type === 'PEER_RECOMMENDED').length
      },
      byPriority: {
        urgent: recommendations.filter(r => r.priority === 'URGENT').length,
        high: recommendations.filter(r => r.priority === 'HIGH').length,
        medium: recommendations.filter(r => r.priority === 'MEDIUM').length,
        low: recommendations.filter(r => r.priority === 'LOW').length
      },
      averageScore: recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length,
      averageConfidence: recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length
    };
  }, [recommendations]);

  const getLearningPathStats = useCallback(() => {
    if (!learningPaths || learningPaths.length === 0) return null;

    return {
      total: learningPaths.length,
      active: learningPaths.filter(p => p.status === 'ACTIVE').length,
      completed: learningPaths.filter(p => p.status === 'COMPLETED').length,
      averageProgress: learningPaths.reduce((sum, p) => sum + p.progress.overallProgress, 0) / learningPaths.length,
      totalHours: learningPaths.reduce((sum, p) => sum + p.progress.totalHours, 0),
      completedHours: learningPaths.reduce((sum, p) => sum + p.progress.hoursCompleted, 0)
    };
  }, [learningPaths]);

  return {
    // State
    recommendations,
    learningPaths,
    userProfile,
    skillGapAnalysis,
    learningHistory,
    trainingContent,
    loading,
    error,

    // Recommendation Operations
    getRecommendations,
    updateRecommendationFeedback,

    // Learning Path Operations
    generateLearningPath,
    getLearningPaths,
    updateLearningPathProgress,

    // User Profile Operations
    getUserProfile,
    updateUserProfile,

    // Skill Analysis Operations
    performSkillGapAnalysis,

    // Learning History Operations
    getLearningHistory,
    trackLearningActivity,

    // Content Operations
    addTrainingContent,
    getTrainingContent,

    // Utility Functions
    clearError,
    refreshAllData,

    // Status Helpers
    getRecommendationStats,
    getLearningPathStats
  };
};

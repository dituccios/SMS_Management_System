-- Risk Assessment Framework Tables

CREATE TABLE risk_categories (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    parent_category_id VARCHAR(36),
    scoring_method ENUM('WEIGHTED_AVERAGE', 'MAXIMUM', 'MINIMUM', 'CUSTOM') DEFAULT 'WEIGHTED_AVERAGE',
    thresholds JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_id (company_id),
    INDEX idx_parent_category (parent_category_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_category_id) REFERENCES risk_categories(id) ON DELETE SET NULL
);

CREATE TABLE risk_factors (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_type ENUM('NUMERIC', 'BOOLEAN', 'CATEGORICAL', 'TEXT', 'DATE') DEFAULT 'NUMERIC',
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    scoring_function JSON NOT NULL,
    data_source JSON NOT NULL,
    update_frequency ENUM('REAL_TIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY') DEFAULT 'DAILY',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_id (category_id),
    INDEX idx_data_type (data_type),
    FOREIGN KEY (category_id) REFERENCES risk_categories(id) ON DELETE CASCADE
);

CREATE TABLE risk_assessments (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    assessment_type ENUM('COMPREHENSIVE', 'TARGETED', 'CONTINUOUS', 'INCIDENT_TRIGGERED', 'COMPLIANCE_DRIVEN') NOT NULL,
    scope JSON NOT NULL,
    methodology JSON NOT NULL,
    executed_at TIMESTAMP NOT NULL,
    executed_by VARCHAR(36) NOT NULL,
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    results JSON,
    recommendations JSON,
    next_assessment_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_id (company_id),
    INDEX idx_status (status),
    INDEX idx_executed_at (executed_at),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE risk_assessment_workflows (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_conditions JSON NOT NULL,
    steps JSON NOT NULL,
    schedule JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active)
);

CREATE TABLE workflow_executions (
    id VARCHAR(36) PRIMARY KEY,
    workflow_id VARCHAR(36) NOT NULL,
    status ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    context JSON,
    current_step INT DEFAULT 1,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_workflow_id (workflow_id),
    INDEX idx_status (status),
    FOREIGN KEY (workflow_id) REFERENCES risk_assessment_workflows(id) ON DELETE CASCADE
);

-- Risk Data Collection Tables

CREATE TABLE risk_data_collectors (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('INCIDENT_BASED', 'EXTERNAL_API', 'MANUAL_INPUT', 'CALCULATED', 'THREAT_INTELLIGENCE') NOT NULL,
    configuration JSON NOT NULL,
    schedule JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    status ENUM('IDLE', 'RUNNING', 'ERROR', 'DISABLED') DEFAULT 'IDLE',
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_is_active (is_active)
);

CREATE TABLE threat_intelligence_feeds (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    feed_type ENUM('IOC', 'VULNERABILITY', 'THREAT_ACTOR', 'CAMPAIGN', 'MALWARE', 'GENERAL') NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    authentication JSON,
    update_frequency INT NOT NULL DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    last_update TIMESTAMP,
    record_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider (provider),
    INDEX idx_feed_type (feed_type),
    INDEX idx_is_active (is_active)
);

CREATE TABLE compliance_requirement_mappings (
    id VARCHAR(36) PRIMARY KEY,
    framework VARCHAR(100) NOT NULL,
    requirement_id VARCHAR(100) NOT NULL,
    requirement_text TEXT NOT NULL,
    risk_factors JSON NOT NULL,
    assessment_criteria JSON NOT NULL,
    evidence_requirements JSON NOT NULL,
    automated_checks JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_framework (framework),
    INDEX idx_requirement_id (requirement_id),
    UNIQUE KEY unique_framework_requirement (framework, requirement_id)
);

CREATE TABLE compliance_assessment_results (
    id VARCHAR(36) PRIMARY KEY,
    mapping_id VARCHAR(36) NOT NULL,
    assessment_date TIMESTAMP NOT NULL,
    results JSON NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL,
    status ENUM('COMPLIANT', 'NON_COMPLIANT', 'PARTIALLY_COMPLIANT', 'UNDER_REVIEW') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mapping_id (mapping_id),
    INDEX idx_assessment_date (assessment_date),
    INDEX idx_status (status),
    FOREIGN KEY (mapping_id) REFERENCES compliance_requirement_mappings(id) ON DELETE CASCADE
);

-- Risk Visualization Tables

CREATE TABLE risk_visualizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('HEATMAP', 'MATRIX', 'DASHBOARD', 'CHART', 'GAUGE', 'TIMELINE') NOT NULL,
    configuration JSON NOT NULL,
    data_query TEXT NOT NULL,
    refresh_interval INT DEFAULT 300,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type)
);

-- Training Recommendation Engine Tables

CREATE TABLE recommendation_engines (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    algorithms JSON NOT NULL,
    configuration JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    performance JSON,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active)
);

CREATE TABLE user_profiles (
    user_id VARCHAR(36) PRIMARY KEY,
    demographics JSON NOT NULL,
    preferences JSON NOT NULL,
    skill_profile JSON NOT NULL,
    learning_history JSON NOT NULL,
    behavior_profile JSON NOT NULL,
    contextual_factors JSON NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE training_content (
    content_id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type ENUM('COURSE', 'MODULE', 'VIDEO', 'DOCUMENT', 'ASSESSMENT', 'SIMULATION', 'WEBINAR') NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    tags JSON,
    skills JSON NOT NULL,
    difficulty ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT') NOT NULL,
    duration INT NOT NULL,
    format ENUM('ONLINE', 'OFFLINE', 'BLENDED', 'SELF_PACED', 'INSTRUCTOR_LED') NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    provider VARCHAR(255),
    instructor VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 0.0,
    review_count INT DEFAULT 0,
    popularity INT DEFAULT 0,
    recency TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cost DECIMAL(10,2) DEFAULT 0.0,
    prerequisites JSON,
    learning_objectives JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_category (category),
    INDEX idx_difficulty (difficulty),
    INDEX idx_format (format),
    INDEX idx_rating (rating),
    FULLTEXT idx_title_description (title, description)
);

CREATE TABLE training_recommendations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    content_id VARCHAR(36) NOT NULL,
    type ENUM('SKILL_GAP', 'CAREER_DEVELOPMENT', 'COMPLIANCE', 'TRENDING', 'PEER_RECOMMENDED', 'MANAGER_ASSIGNED') NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    reasoning JSON NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL,
    category VARCHAR(100) NOT NULL,
    estimated_benefit TEXT,
    time_to_complete INT NOT NULL,
    prerequisites JSON,
    alternatives JSON,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    status ENUM('PENDING', 'VIEWED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'EXPIRED') DEFAULT 'PENDING',
    feedback JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_content_id (content_id),
    INDEX idx_type (type),
    INDEX idx_priority (priority),
    INDEX idx_status (status),
    INDEX idx_generated_at (generated_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES training_content(content_id) ON DELETE CASCADE
);

CREATE TABLE personalized_learning_paths (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objective TEXT NOT NULL,
    target_skills JSON NOT NULL,
    estimated_duration INT NOT NULL,
    difficulty ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'MIXED') NOT NULL,
    courses JSON NOT NULL,
    milestones JSON NOT NULL,
    adaptive_rules JSON NOT NULL,
    progress JSON NOT NULL,
    status ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED') DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Profiling Tables

CREATE TABLE skill_gap_analyses (
    user_id VARCHAR(36) NOT NULL,
    analysis_date TIMESTAMP NOT NULL,
    skill_gaps JSON NOT NULL,
    prioritized_gaps JSON NOT NULL,
    recommendations JSON NOT NULL,
    overall_gap_score DECIMAL(5,2) NOT NULL,
    critical_gaps INT NOT NULL,
    time_to_close INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, analysis_date),
    INDEX idx_analysis_date (analysis_date),
    INDEX idx_overall_gap_score (overall_gap_score),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE learning_activities (
    activity_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type ENUM('COURSE_START', 'COURSE_COMPLETE', 'MODULE_COMPLETE', 'ASSESSMENT_TAKEN', 'RESOURCE_ACCESSED', 'DISCUSSION_PARTICIPATED') NOT NULL,
    content_id VARCHAR(36) NOT NULL,
    content_title VARCHAR(500) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    duration INT NOT NULL,
    score DECIMAL(5,2),
    rating DECIMAL(3,2),
    feedback TEXT,
    context JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_content_id (content_id),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE role_requirement_mappings (
    role_id VARCHAR(36) PRIMARY KEY,
    role_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    level VARCHAR(50) NOT NULL,
    required_skills JSON NOT NULL,
    recommended_skills JSON NOT NULL,
    compliance_requirements JSON NOT NULL,
    career_progression JSON NOT NULL,
    performance_indicators JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role_name (role_name),
    INDEX idx_department (department),
    INDEX idx_level (level)
);

CREATE TABLE interest_preference_models (
    user_id VARCHAR(36) PRIMARY KEY,
    interests JSON NOT NULL,
    preferences JSON NOT NULL,
    motivations JSON NOT NULL,
    learning_goals JSON NOT NULL,
    constraints JSON NOT NULL,
    personality_profile JSON NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Machine Learning Models Table

CREATE TABLE ml_models (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('CLASSIFICATION', 'REGRESSION', 'CLUSTERING', 'ANOMALY_DETECTION', 'TIME_SERIES') NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    features JSON NOT NULL,
    target_variable VARCHAR(100) NOT NULL,
    model_parameters JSON,
    performance JSON NOT NULL,
    last_trained TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_is_active (is_active),
    INDEX idx_last_trained (last_trained)
);

-- Compliance Forecasting Tables

CREATE TABLE compliance_data_points (
    id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    metric VARCHAR(255) NOT NULL,
    value DECIMAL(10,4) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    category VARCHAR(100),
    source VARCHAR(255),
    context JSON,
    quality DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company_framework (company_id, framework),
    INDEX idx_metric_timestamp (metric, timestamp),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE historical_compliance_analyses (
    analysis_id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    analysis_date TIMESTAMP NOT NULL,
    time_range JSON NOT NULL,
    data_points JSON NOT NULL,
    trends JSON NOT NULL,
    patterns JSON NOT NULL,
    anomalies JSON NOT NULL,
    insights JSON NOT NULL,
    statistics JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company_framework (company_id, framework),
    INDEX idx_analysis_date (analysis_date),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE compliance_patterns (
    pattern_id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    type ENUM('CYCLICAL', 'SEASONAL', 'TREND', 'ANOMALY', 'CORRELATION', 'THRESHOLD') NOT NULL,
    description TEXT NOT NULL,
    metrics JSON NOT NULL,
    frequency DECIMAL(8,4) NOT NULL,
    strength DECIMAL(5,4) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    occurrences JSON NOT NULL,
    predictability DECIMAL(5,4) NOT NULL,
    business_impact ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_framework (company_id, framework),
    INDEX idx_type (type),
    INDEX idx_confidence (confidence),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE leading_indicators (
    indicator_id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_metric VARCHAR(255) NOT NULL,
    lead_time INT NOT NULL,
    correlation DECIMAL(5,4) NOT NULL,
    predictive_power DECIMAL(5,4) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    data_source VARCHAR(255) NOT NULL,
    calculation_method TEXT NOT NULL,
    thresholds JSON NOT NULL,
    historical_performance JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_framework (company_id, framework),
    INDEX idx_target_metric (target_metric),
    INDEX idx_correlation (correlation),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE compliance_risk_scores (
    score_id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    calculation_date TIMESTAMP NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL,
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    components JSON NOT NULL,
    trends JSON NOT NULL,
    factors JSON NOT NULL,
    scenarios JSON NOT NULL,
    recommendations JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company_framework (company_id, framework),
    INDEX idx_calculation_date (calculation_date),
    INDEX idx_risk_level (risk_level),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE time_series_forecasts (
    forecast_id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    metric VARCHAR(255) NOT NULL,
    model JSON NOT NULL,
    decomposition JSON NOT NULL,
    stationarity JSON NOT NULL,
    seasonality JSON NOT NULL,
    trend JSON NOT NULL,
    forecasts JSON NOT NULL,
    diagnostics JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_framework (company_id, framework),
    INDEX idx_metric (metric),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE compliance_forecasts (
    forecast_id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    metric VARCHAR(255) NOT NULL,
    forecast_date TIMESTAMP NOT NULL,
    forecast_horizon INT NOT NULL,
    model JSON NOT NULL,
    predictions JSON NOT NULL,
    confidence JSON NOT NULL,
    accuracy JSON NOT NULL,
    scenarios JSON NOT NULL,
    assumptions JSON NOT NULL,
    limitations JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_framework (company_id, framework),
    INDEX idx_metric (metric),
    INDEX idx_forecast_date (forecast_date),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE what_if_analyses (
    analysis_id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    base_scenario JSON NOT NULL,
    alternative_scenarios JSON NOT NULL,
    variables JSON NOT NULL,
    results JSON NOT NULL,
    sensitivity JSON NOT NULL,
    recommendations JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company_framework (company_id, framework),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE compliance_interventions (
    intervention_id VARCHAR(36) PRIMARY KEY,
    company_id VARCHAR(36) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('TRAINING', 'PROCESS', 'TECHNOLOGY', 'POLICY', 'AUDIT', 'MONITORING') NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    expected_impact DECIMAL(5,2) NOT NULL,
    actual_impact DECIMAL(5,2),
    progress DECIMAL(5,2) DEFAULT 0,
    status ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD') DEFAULT 'PLANNED',
    cost DECIMAL(12,2),
    roi DECIMAL(8,4),
    metrics_affected JSON,
    success_criteria JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_framework (company_id, framework),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_start_date (start_date),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE forecast_accuracy_tracking (
    tracking_id VARCHAR(36) PRIMARY KEY,
    forecast_id VARCHAR(36) NOT NULL,
    company_id VARCHAR(36) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    metric VARCHAR(255) NOT NULL,
    forecast_date TIMESTAMP NOT NULL,
    horizon INT NOT NULL,
    predicted_value DECIMAL(10,4) NOT NULL,
    actual_value DECIMAL(10,4),
    error_value DECIMAL(10,4),
    absolute_error DECIMAL(10,4),
    percentage_error DECIMAL(8,4),
    accuracy_score DECIMAL(5,4),
    measured_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_forecast_id (forecast_id),
    INDEX idx_company_framework (company_id, framework),
    INDEX idx_metric (metric),
    INDEX idx_forecast_date (forecast_date),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Additional Indexes for Performance

CREATE INDEX idx_risk_assessments_company_status ON risk_assessments(company_id, status);
CREATE INDEX idx_training_recommendations_user_status ON training_recommendations(user_id, status);
CREATE INDEX idx_learning_activities_user_timestamp ON learning_activities(user_id, timestamp);
CREATE INDEX idx_training_content_category_difficulty ON training_content(category, difficulty);
CREATE INDEX idx_personalized_learning_paths_user_status ON personalized_learning_paths(user_id, status);

-- Compliance Forecasting Indexes
CREATE INDEX idx_compliance_data_points_company_framework_metric ON compliance_data_points(company_id, framework, metric);
CREATE INDEX idx_compliance_data_points_timestamp_value ON compliance_data_points(timestamp, value);
CREATE INDEX idx_compliance_forecasts_company_framework_metric ON compliance_forecasts(company_id, framework, metric);
CREATE INDEX idx_time_series_forecasts_company_framework_metric ON time_series_forecasts(company_id, framework, metric);
CREATE INDEX idx_compliance_interventions_company_status ON compliance_interventions(company_id, status);
CREATE INDEX idx_forecast_accuracy_tracking_forecast_horizon ON forecast_accuracy_tracking(forecast_id, horizon);

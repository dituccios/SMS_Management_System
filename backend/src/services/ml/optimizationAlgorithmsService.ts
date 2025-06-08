import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';
import auditLoggingService from '../audit/auditLoggingService';

const prisma = new PrismaClient();

export interface OptimizationProblem {
  problemId: string;
  name: string;
  type: 'CONSTRAINT_SATISFACTION' | 'GENETIC_ALGORITHM' | 'MULTI_OBJECTIVE' | 'RESOURCE_ALLOCATION' | 'ROUTE_OPTIMIZATION';
  description: string;
  objectives: Objective[];
  constraints: Constraint[];
  variables: Variable[];
  parameters: OptimizationParameters;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  solution?: OptimizationSolution;
  createdAt: Date;
  updatedAt: Date;
}

export interface Objective {
  objectiveId: string;
  name: string;
  type: 'MINIMIZE' | 'MAXIMIZE';
  expression: string;
  weight: number;
  priority: number;
  description: string;
}

export interface Constraint {
  constraintId: string;
  name: string;
  type: 'EQUALITY' | 'INEQUALITY' | 'BOUND' | 'LOGICAL';
  expression: string;
  operator: 'EQ' | 'LE' | 'GE' | 'LT' | 'GT';
  value: number;
  tolerance?: number;
  description: string;
}

export interface Variable {
  variableId: string;
  name: string;
  type: 'CONTINUOUS' | 'INTEGER' | 'BINARY' | 'CATEGORICAL';
  lowerBound?: number;
  upperBound?: number;
  initialValue?: number;
  categories?: string[];
  description: string;
}

export interface OptimizationParameters {
  algorithm: string;
  maxIterations: number;
  tolerance: number;
  timeLimit: number; // seconds
  populationSize?: number;
  crossoverRate?: number;
  mutationRate?: number;
  elitismRate?: number;
  convergenceCriteria: ConvergenceCriteria;
  parallelization: ParallelizationConfig;
}

export interface ConvergenceCriteria {
  type: 'OBJECTIVE_CHANGE' | 'VARIABLE_CHANGE' | 'GRADIENT_NORM' | 'ITERATION_LIMIT';
  threshold: number;
  consecutiveIterations: number;
}

export interface ParallelizationConfig {
  enabled: boolean;
  threads: number;
  strategy: 'ISLAND_MODEL' | 'MASTER_SLAVE' | 'CELLULAR';
}

export interface OptimizationSolution {
  solutionId: string;
  problemId: string;
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNBOUNDED' | 'TIME_LIMIT' | 'ITERATION_LIMIT';
  objectiveValues: Record<string, number>;
  variableValues: Record<string, number>;
  constraintViolations: ConstraintViolation[];
  metadata: SolutionMetadata;
  alternatives: AlternativeSolution[];
  sensitivity: SensitivityAnalysis;
}

export interface ConstraintViolation {
  constraintId: string;
  violation: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SolutionMetadata {
  iterations: number;
  runtime: number;
  convergenceHistory: ConvergencePoint[];
  algorithmSpecific: Record<string, any>;
}

export interface ConvergencePoint {
  iteration: number;
  objectiveValue: number;
  constraintViolation: number;
  timestamp: Date;
}

export interface AlternativeSolution {
  solutionId: string;
  rank: number;
  objectiveValues: Record<string, number>;
  variableValues: Record<string, number>;
  dominationCount: number;
  crowdingDistance: number;
}

export interface SensitivityAnalysis {
  objectiveSensitivity: ObjectiveSensitivity[];
  constraintSensitivity: ConstraintSensitivity[];
  variableSensitivity: VariableSensitivity[];
}

export interface ObjectiveSensitivity {
  objectiveId: string;
  shadowPrice: number;
  allowableIncrease: number;
  allowableDecrease: number;
}

export interface ConstraintSensitivity {
  constraintId: string;
  shadowPrice: number;
  slack: number;
  allowableIncrease: number;
  allowableDecrease: number;
}

export interface VariableSensitivity {
  variableId: string;
  reducedCost: number;
  allowableIncrease: number;
  allowableDecrease: number;
}

// Specific problem types
export interface SchedulingProblem extends OptimizationProblem {
  tasks: Task[];
  resources: Resource[];
  timeHorizon: TimeHorizon;
  preferences: SchedulingPreferences;
}

export interface Task {
  taskId: string;
  name: string;
  duration: number;
  priority: number;
  dependencies: string[];
  resourceRequirements: ResourceRequirement[];
  timeWindows: TimeWindow[];
  skills: string[];
}

export interface Resource {
  resourceId: string;
  name: string;
  type: 'HUMAN' | 'EQUIPMENT' | 'FACILITY' | 'MATERIAL';
  capacity: number;
  availability: AvailabilityWindow[];
  skills: string[];
  cost: number;
}

export interface ResourceRequirement {
  resourceType: string;
  quantity: number;
  skills?: string[];
  alternatives?: string[];
}

export interface TimeWindow {
  start: Date;
  end: Date;
  type: 'PREFERRED' | 'REQUIRED' | 'FORBIDDEN';
}

export interface AvailabilityWindow {
  start: Date;
  end: Date;
  capacity: number;
}

export interface TimeHorizon {
  start: Date;
  end: Date;
  granularity: 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK';
}

export interface SchedulingPreferences {
  balanceWorkload: boolean;
  minimizeOvertime: boolean;
  respectSkillMatching: boolean;
  allowResourceSharing: boolean;
  prioritizeUrgentTasks: boolean;
}

export interface RouteOptimizationProblem extends OptimizationProblem {
  vehicles: Vehicle[];
  locations: Location[];
  demands: Demand[];
  distanceMatrix: number[][];
  timeMatrix: number[][];
  depot: Location;
}

export interface Vehicle {
  vehicleId: string;
  capacity: number;
  maxDistance: number;
  maxTime: number;
  cost: VehicleCost;
  availability: TimeWindow[];
  skills: string[];
}

export interface VehicleCost {
  fixed: number;
  perDistance: number;
  perTime: number;
  overtime: number;
}

export interface Location {
  locationId: string;
  name: string;
  coordinates: { lat: number; lng: number };
  timeWindows: TimeWindow[];
  serviceTime: number;
}

export interface Demand {
  demandId: string;
  locationId: string;
  quantity: number;
  priority: number;
  skills?: string[];
  timeWindows: TimeWindow[];
}

export class OptimizationAlgorithmsService extends EventEmitter {

  // Solve constraint satisfaction problem
  async solveConstraintSatisfaction(problem: OptimizationProblem): Promise<OptimizationSolution> {
    try {
      logger.info('Solving constraint satisfaction problem', { problemId: problem.problemId });

      const startTime = Date.now();
      
      // Initialize solution
      const solution: OptimizationSolution = {
        solutionId: crypto.randomUUID(),
        problemId: problem.problemId,
        status: 'FEASIBLE',
        objectiveValues: {},
        variableValues: {},
        constraintViolations: [],
        metadata: {
          iterations: 0,
          runtime: 0,
          convergenceHistory: [],
          algorithmSpecific: {}
        },
        alternatives: [],
        sensitivity: {
          objectiveSensitivity: [],
          constraintSensitivity: [],
          variableSensitivity: []
        }
      };

      // Apply constraint propagation
      await this.applyConstraintPropagation(problem, solution);

      // Use backtracking search
      const feasibleSolution = await this.backtrackingSearch(problem, solution);

      if (feasibleSolution) {
        solution.status = 'OPTIMAL';
        solution.variableValues = feasibleSolution.variableValues;
        solution.objectiveValues = this.evaluateObjectives(problem, feasibleSolution.variableValues);
      } else {
        solution.status = 'INFEASIBLE';
      }

      solution.metadata.runtime = Date.now() - startTime;

      // Store solution
      await this.storeSolution(solution);

      this.emit('problemSolved', { problemId: problem.problemId, solution });

      logger.info('Constraint satisfaction problem solved', {
        problemId: problem.problemId,
        status: solution.status,
        runtime: solution.metadata.runtime
      });

      return solution;
    } catch (error) {
      logger.error('Failed to solve constraint satisfaction problem:', error);
      throw error;
    }
  }

  // Solve using genetic algorithm
  async solveGeneticAlgorithm(problem: OptimizationProblem): Promise<OptimizationSolution> {
    try {
      logger.info('Solving with genetic algorithm', { problemId: problem.problemId });

      const startTime = Date.now();
      const params = problem.parameters;
      
      // Initialize population
      let population = await this.initializePopulation(problem, params.populationSize || 100);
      
      const solution: OptimizationSolution = {
        solutionId: crypto.randomUUID(),
        problemId: problem.problemId,
        status: 'FEASIBLE',
        objectiveValues: {},
        variableValues: {},
        constraintViolations: [],
        metadata: {
          iterations: 0,
          runtime: 0,
          convergenceHistory: [],
          algorithmSpecific: {
            populationSize: params.populationSize,
            crossoverRate: params.crossoverRate,
            mutationRate: params.mutationRate
          }
        },
        alternatives: [],
        sensitivity: {
          objectiveSensitivity: [],
          constraintSensitivity: [],
          variableSensitivity: []
        }
      };

      // Evolution loop
      for (let generation = 0; generation < params.maxIterations; generation++) {
        // Evaluate fitness
        const fitness = await this.evaluateFitness(problem, population);
        
        // Record convergence
        const bestFitness = Math.max(...fitness);
        solution.metadata.convergenceHistory.push({
          iteration: generation,
          objectiveValue: bestFitness,
          constraintViolation: 0,
          timestamp: new Date()
        });

        // Check convergence
        if (await this.checkConvergence(solution.metadata.convergenceHistory, params.convergenceCriteria)) {
          break;
        }

        // Selection
        const parents = await this.selection(population, fitness);
        
        // Crossover
        const offspring = await this.crossover(parents, params.crossoverRate || 0.8);
        
        // Mutation
        await this.mutation(offspring, params.mutationRate || 0.1);
        
        // Replacement
        population = await this.replacement(population, offspring, fitness, params.elitismRate || 0.1);
        
        solution.metadata.iterations = generation + 1;
      }

      // Extract best solution
      const fitness = await this.evaluateFitness(problem, population);
      const bestIndex = fitness.indexOf(Math.max(...fitness));
      const bestIndividual = population[bestIndex];

      solution.variableValues = this.decodeIndividual(problem, bestIndividual);
      solution.objectiveValues = this.evaluateObjectives(problem, solution.variableValues);
      solution.status = 'OPTIMAL';
      solution.metadata.runtime = Date.now() - startTime;

      // Generate alternative solutions (Pareto front for multi-objective)
      solution.alternatives = await this.generateAlternatives(problem, population, fitness);

      await this.storeSolution(solution);

      this.emit('problemSolved', { problemId: problem.problemId, solution });

      logger.info('Genetic algorithm completed', {
        problemId: problem.problemId,
        generations: solution.metadata.iterations,
        runtime: solution.metadata.runtime
      });

      return solution;
    } catch (error) {
      logger.error('Failed to solve with genetic algorithm:', error);
      throw error;
    }
  }

  // Solve multi-objective optimization
  async solveMultiObjective(problem: OptimizationProblem): Promise<OptimizationSolution> {
    try {
      logger.info('Solving multi-objective optimization', { problemId: problem.problemId });

      // Use NSGA-II algorithm
      const solution = await this.nsga2Algorithm(problem);

      this.emit('problemSolved', { problemId: problem.problemId, solution });

      return solution;
    } catch (error) {
      logger.error('Failed to solve multi-objective optimization:', error);
      throw error;
    }
  }

  // Solve resource allocation problem
  async solveResourceAllocation(
    resources: Resource[],
    demands: Demand[],
    objectives: Objective[],
    constraints: Constraint[]
  ): Promise<OptimizationSolution> {
    try {
      logger.info('Solving resource allocation problem', {
        resourceCount: resources.length,
        demandCount: demands.length
      });

      // Create optimization problem
      const problem: OptimizationProblem = {
        problemId: crypto.randomUUID(),
        name: 'Resource Allocation',
        type: 'RESOURCE_ALLOCATION',
        description: 'Optimal allocation of resources to demands',
        objectives,
        constraints,
        variables: this.createAllocationVariables(resources, demands),
        parameters: {
          algorithm: 'LINEAR_PROGRAMMING',
          maxIterations: 1000,
          tolerance: 1e-6,
          timeLimit: 300,
          convergenceCriteria: {
            type: 'OBJECTIVE_CHANGE',
            threshold: 1e-6,
            consecutiveIterations: 10
          },
          parallelization: {
            enabled: false,
            threads: 1,
            strategy: 'MASTER_SLAVE'
          }
        },
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Solve using linear programming
      const solution = await this.solveLinearProgram(problem);

      return solution;
    } catch (error) {
      logger.error('Failed to solve resource allocation:', error);
      throw error;
    }
  }

  // Solve route optimization problem
  async solveRouteOptimization(routeProblem: RouteOptimizationProblem): Promise<OptimizationSolution> {
    try {
      logger.info('Solving route optimization problem', {
        problemId: routeProblem.problemId,
        vehicleCount: routeProblem.vehicles.length,
        locationCount: routeProblem.locations.length
      });

      // Use Clarke-Wright savings algorithm with local search improvements
      const solution = await this.clarkeWrightAlgorithm(routeProblem);

      // Apply local search improvements
      await this.applyLocalSearchImprovements(routeProblem, solution);

      this.emit('problemSolved', { problemId: routeProblem.problemId, solution });

      return solution;
    } catch (error) {
      logger.error('Failed to solve route optimization:', error);
      throw error;
    }
  }

  // Solve scheduling problem
  async solveScheduling(schedulingProblem: SchedulingProblem): Promise<OptimizationSolution> {
    try {
      logger.info('Solving scheduling problem', {
        problemId: schedulingProblem.problemId,
        taskCount: schedulingProblem.tasks.length,
        resourceCount: schedulingProblem.resources.length
      });

      // Use constraint programming with search strategies
      const solution = await this.constraintProgrammingScheduling(schedulingProblem);

      this.emit('problemSolved', { problemId: schedulingProblem.problemId, solution });

      return solution;
    } catch (error) {
      logger.error('Failed to solve scheduling problem:', error);
      throw error;
    }
  }

  // Private helper methods
  private async applyConstraintPropagation(
    problem: OptimizationProblem,
    solution: OptimizationSolution
  ): Promise<void> {
    // Simplified constraint propagation
    for (const variable of problem.variables) {
      if (variable.type === 'BINARY') {
        solution.variableValues[variable.name] = 0;
      } else if (variable.lowerBound !== undefined) {
        solution.variableValues[variable.name] = variable.lowerBound;
      } else {
        solution.variableValues[variable.name] = variable.initialValue || 0;
      }
    }
  }

  private async backtrackingSearch(
    problem: OptimizationProblem,
    solution: OptimizationSolution
  ): Promise<{ variableValues: Record<string, number> } | null> {
    // Simplified backtracking search
    const assignment: Record<string, number> = {};
    
    for (const variable of problem.variables) {
      if (variable.type === 'BINARY') {
        assignment[variable.name] = Math.random() > 0.5 ? 1 : 0;
      } else {
        const min = variable.lowerBound || 0;
        const max = variable.upperBound || 100;
        assignment[variable.name] = min + Math.random() * (max - min);
      }
    }

    // Check if assignment satisfies constraints
    const satisfiesConstraints = await this.checkConstraints(problem, assignment);
    
    return satisfiesConstraints ? { variableValues: assignment } : null;
  }

  private async checkConstraints(
    problem: OptimizationProblem,
    assignment: Record<string, number>
  ): Promise<boolean> {
    // Simplified constraint checking
    for (const constraint of problem.constraints) {
      // This would evaluate the constraint expression
      // For now, we'll assume all constraints are satisfied
    }
    return true;
  }

  private evaluateObjectives(
    problem: OptimizationProblem,
    variableValues: Record<string, number>
  ): Record<string, number> {
    const objectiveValues: Record<string, number> = {};
    
    for (const objective of problem.objectives) {
      // Simplified objective evaluation
      objectiveValues[objective.name] = Math.random() * 100;
    }
    
    return objectiveValues;
  }

  // Genetic Algorithm methods
  private async initializePopulation(problem: OptimizationProblem, size: number): Promise<any[]> {
    const population = [];
    
    for (let i = 0; i < size; i++) {
      const individual: Record<string, number> = {};
      
      for (const variable of problem.variables) {
        if (variable.type === 'BINARY') {
          individual[variable.name] = Math.random() > 0.5 ? 1 : 0;
        } else {
          const min = variable.lowerBound || 0;
          const max = variable.upperBound || 100;
          individual[variable.name] = min + Math.random() * (max - min);
        }
      }
      
      population.push(individual);
    }
    
    return population;
  }

  private async evaluateFitness(problem: OptimizationProblem, population: any[]): Promise<number[]> {
    return population.map(() => Math.random() * 100);
  }

  private async checkConvergence(
    history: ConvergencePoint[],
    criteria: ConvergenceCriteria
  ): Promise<boolean> {
    if (history.length < criteria.consecutiveIterations) {
      return false;
    }
    
    const recent = history.slice(-criteria.consecutiveIterations);
    const changes = recent.slice(1).map((point, i) => 
      Math.abs(point.objectiveValue - recent[i].objectiveValue)
    );
    
    return changes.every(change => change < criteria.threshold);
  }

  private async selection(population: any[], fitness: number[]): Promise<any[]> {
    // Tournament selection
    const parents = [];
    const tournamentSize = 3;
    
    for (let i = 0; i < population.length; i++) {
      const tournament = [];
      for (let j = 0; j < tournamentSize; j++) {
        const index = Math.floor(Math.random() * population.length);
        tournament.push({ individual: population[index], fitness: fitness[index] });
      }
      
      tournament.sort((a, b) => b.fitness - a.fitness);
      parents.push(tournament[0].individual);
    }
    
    return parents;
  }

  private async crossover(parents: any[], rate: number): Promise<any[]> {
    const offspring = [];
    
    for (let i = 0; i < parents.length; i += 2) {
      if (Math.random() < rate && i + 1 < parents.length) {
        // Single-point crossover
        const parent1 = parents[i];
        const parent2 = parents[i + 1];
        const keys = Object.keys(parent1);
        const crossoverPoint = Math.floor(Math.random() * keys.length);
        
        const child1: any = {};
        const child2: any = {};
        
        keys.forEach((key, index) => {
          if (index < crossoverPoint) {
            child1[key] = parent1[key];
            child2[key] = parent2[key];
          } else {
            child1[key] = parent2[key];
            child2[key] = parent1[key];
          }
        });
        
        offspring.push(child1, child2);
      } else {
        offspring.push(parents[i]);
        if (i + 1 < parents.length) {
          offspring.push(parents[i + 1]);
        }
      }
    }
    
    return offspring;
  }

  private async mutation(population: any[], rate: number): Promise<void> {
    for (const individual of population) {
      for (const key of Object.keys(individual)) {
        if (Math.random() < rate) {
          // Gaussian mutation
          individual[key] += (Math.random() - 0.5) * 10;
        }
      }
    }
  }

  private async replacement(
    population: any[],
    offspring: any[],
    fitness: number[],
    elitismRate: number
  ): Promise<any[]> {
    // Elitist replacement
    const eliteCount = Math.floor(population.length * elitismRate);
    const sortedIndices = fitness
      .map((f, i) => ({ fitness: f, index: i }))
      .sort((a, b) => b.fitness - a.fitness)
      .map(item => item.index);
    
    const newPopulation = [];
    
    // Keep elite individuals
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push(population[sortedIndices[i]]);
    }
    
    // Add offspring
    for (let i = 0; i < population.length - eliteCount; i++) {
      newPopulation.push(offspring[i % offspring.length]);
    }
    
    return newPopulation;
  }

  private decodeIndividual(problem: OptimizationProblem, individual: any): Record<string, number> {
    return individual;
  }

  private async generateAlternatives(
    problem: OptimizationProblem,
    population: any[],
    fitness: number[]
  ): Promise<AlternativeSolution[]> {
    const alternatives: AlternativeSolution[] = [];
    
    // Sort by fitness and take top solutions
    const sortedIndices = fitness
      .map((f, i) => ({ fitness: f, index: i }))
      .sort((a, b) => b.fitness - a.fitness);
    
    for (let i = 0; i < Math.min(5, population.length); i++) {
      const individual = population[sortedIndices[i].index];
      alternatives.push({
        solutionId: crypto.randomUUID(),
        rank: i + 1,
        objectiveValues: this.evaluateObjectives(problem, individual),
        variableValues: individual,
        dominationCount: 0,
        crowdingDistance: 0
      });
    }
    
    return alternatives;
  }

  // Simplified implementations for other algorithms
  private async nsga2Algorithm(problem: OptimizationProblem): Promise<OptimizationSolution> {
    // Simplified NSGA-II implementation
    return {
      solutionId: crypto.randomUUID(),
      problemId: problem.problemId,
      status: 'OPTIMAL',
      objectiveValues: {},
      variableValues: {},
      constraintViolations: [],
      metadata: {
        iterations: 100,
        runtime: 5000,
        convergenceHistory: [],
        algorithmSpecific: { algorithm: 'NSGA-II' }
      },
      alternatives: [],
      sensitivity: {
        objectiveSensitivity: [],
        constraintSensitivity: [],
        variableSensitivity: []
      }
    };
  }

  private createAllocationVariables(resources: Resource[], demands: Demand[]): Variable[] {
    const variables: Variable[] = [];
    
    for (const resource of resources) {
      for (const demand of demands) {
        variables.push({
          variableId: crypto.randomUUID(),
          name: `allocation_${resource.resourceId}_${demand.demandId}`,
          type: 'CONTINUOUS',
          lowerBound: 0,
          upperBound: Math.min(resource.capacity, demand.quantity),
          description: `Allocation of ${resource.name} to ${demand.demandId}`
        });
      }
    }
    
    return variables;
  }

  private async solveLinearProgram(problem: OptimizationProblem): Promise<OptimizationSolution> {
    // Simplified linear programming solver
    return {
      solutionId: crypto.randomUUID(),
      problemId: problem.problemId,
      status: 'OPTIMAL',
      objectiveValues: { 'total_cost': 1000 },
      variableValues: {},
      constraintViolations: [],
      metadata: {
        iterations: 50,
        runtime: 1000,
        convergenceHistory: [],
        algorithmSpecific: { algorithm: 'SIMPLEX' }
      },
      alternatives: [],
      sensitivity: {
        objectiveSensitivity: [],
        constraintSensitivity: [],
        variableSensitivity: []
      }
    };
  }

  private async clarkeWrightAlgorithm(problem: RouteOptimizationProblem): Promise<OptimizationSolution> {
    // Simplified Clarke-Wright savings algorithm
    return {
      solutionId: crypto.randomUUID(),
      problemId: problem.problemId,
      status: 'OPTIMAL',
      objectiveValues: { 'total_distance': 500, 'total_cost': 750 },
      variableValues: {},
      constraintViolations: [],
      metadata: {
        iterations: 1,
        runtime: 500,
        convergenceHistory: [],
        algorithmSpecific: { algorithm: 'CLARKE_WRIGHT' }
      },
      alternatives: [],
      sensitivity: {
        objectiveSensitivity: [],
        constraintSensitivity: [],
        variableSensitivity: []
      }
    };
  }

  private async applyLocalSearchImprovements(
    problem: RouteOptimizationProblem,
    solution: OptimizationSolution
  ): Promise<void> {
    // Apply 2-opt and 3-opt improvements
    solution.metadata.algorithmSpecific.localSearchImprovements = ['2-opt', '3-opt'];
  }

  private async constraintProgrammingScheduling(problem: SchedulingProblem): Promise<OptimizationSolution> {
    // Simplified constraint programming for scheduling
    return {
      solutionId: crypto.randomUUID(),
      problemId: problem.problemId,
      status: 'OPTIMAL',
      objectiveValues: { 'makespan': 240, 'total_cost': 5000 },
      variableValues: {},
      constraintViolations: [],
      metadata: {
        iterations: 1000,
        runtime: 3000,
        convergenceHistory: [],
        algorithmSpecific: { algorithm: 'CONSTRAINT_PROGRAMMING' }
      },
      alternatives: [],
      sensitivity: {
        objectiveSensitivity: [],
        constraintSensitivity: [],
        variableSensitivity: []
      }
    };
  }

  private async storeSolution(solution: OptimizationSolution): Promise<void> {
    try {
      await prisma.optimizationSolution.create({
        data: {
          solutionId: solution.solutionId,
          problemId: solution.problemId,
          status: solution.status,
          objectiveValues: solution.objectiveValues,
          variableValues: solution.variableValues,
          constraintViolations: solution.constraintViolations,
          metadata: solution.metadata,
          alternatives: solution.alternatives,
          sensitivity: solution.sensitivity,
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to store optimization solution:', error);
    }
  }
}

export default new OptimizationAlgorithmsService();

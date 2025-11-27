import { DependencyGraph } from '@/types/graph';
import { GlobalMetrics } from '@/types/metrics';

export const exampleGraph: DependencyGraph = {
  nodes: [
    // Cluster 0: Core/App - Entry points and configuration
    {
      id: 'app.main',
      label: 'main.py',
      type: 'internal' as const,
      module: 'app',
      position: { x: 0, y: 0, z: 0 },
      color: '#0d9488',
      cluster_id: 0,
      metrics: {
        afferent_coupling: 0,
        efferent_coupling: 8,
        instability: 1.0,
        is_circular: false,
        is_high_coupling: true,
        cyclomatic_complexity: 8,
        max_complexity: 5,
        maintainability_index: 72,
        lines_of_code: 156,
        complexity_grade: 'B',
        maintainability_grade: 'B',
        is_hot_zone: false,
        hot_zone_severity: 'info' as const,
        hot_zone_score: 0.35,
        hot_zone_reason: 'High efferent coupling - entry point'
      }
    },
    {
      id: 'app.config',
      label: 'config.py',
      type: 'internal' as const,
      module: 'app',
      position: { x: -15, y: 5, z: 5 },
      color: '#0d9488',
      cluster_id: 0,
      metrics: {
        afferent_coupling: 12,
        efferent_coupling: 1,
        instability: 0.08,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 2,
        max_complexity: 1,
        maintainability_index: 95,
        lines_of_code: 45,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.05,
        hot_zone_reason: ''
      }
    },
    {
      id: 'app.settings',
      label: 'settings.py',
      type: 'internal' as const,
      module: 'app',
      position: { x: 15, y: 5, z: 5 },
      color: '#0d9488',
      cluster_id: 0,
      metrics: {
        afferent_coupling: 8,
        efferent_coupling: 2,
        instability: 0.2,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 3,
        max_complexity: 2,
        maintainability_index: 88,
        lines_of_code: 67,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.08,
        hot_zone_reason: ''
      }
    },

    // Cluster 1: API/Routes - HTTP endpoints
    {
      id: 'api.routes',
      label: 'routes.py',
      type: 'internal' as const,
      module: 'api',
      position: { x: 0, y: 20, z: 15 },
      color: '#0d9488',
      cluster_id: 1,
      metrics: {
        afferent_coupling: 2,
        efferent_coupling: 7,
        instability: 0.78,
        is_circular: false,
        is_high_coupling: true,
        cyclomatic_complexity: 15,
        max_complexity: 8,
        maintainability_index: 62,
        lines_of_code: 289,
        complexity_grade: 'B',
        maintainability_grade: 'C',
        is_hot_zone: true,
        hot_zone_severity: 'warning' as const,
        hot_zone_score: 0.68,
        hot_zone_reason: 'High coupling with moderate complexity'
      }
    },
    {
      id: 'api.middleware',
      label: 'middleware.py',
      type: 'internal' as const,
      module: 'api',
      position: { x: -20, y: 25, z: 12 },
      color: '#0d9488',
      cluster_id: 1,
      metrics: {
        afferent_coupling: 3,
        efferent_coupling: 4,
        instability: 0.57,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 12,
        max_complexity: 6,
        maintainability_index: 68,
        lines_of_code: 178,
        complexity_grade: 'B',
        maintainability_grade: 'C',
        is_hot_zone: false,
        hot_zone_severity: 'info' as const,
        hot_zone_score: 0.42,
        hot_zone_reason: 'Moderate instability'
      }
    },
    {
      id: 'api.auth',
      label: 'auth.py',
      type: 'internal' as const,
      module: 'api',
      position: { x: 20, y: 25, z: 12 },
      color: '#0d9488',
      cluster_id: 1,
      metrics: {
        afferent_coupling: 5,
        efferent_coupling: 6,
        instability: 0.55,
        is_circular: true,
        is_high_coupling: false,
        cyclomatic_complexity: 22,
        max_complexity: 14,
        maintainability_index: 52,
        lines_of_code: 345,
        complexity_grade: 'C',
        maintainability_grade: 'D',
        is_hot_zone: true,
        hot_zone_severity: 'critical' as const,
        hot_zone_score: 0.92,
        hot_zone_reason: 'Circular dependency with high complexity'
      }
    },

    // Cluster 2: Services - Business logic
    {
      id: 'services.user',
      label: 'user_service.py',
      type: 'internal' as const,
      module: 'services',
      position: { x: -25, y: -15, z: 20 },
      color: '#0d9488',
      cluster_id: 2,
      metrics: {
        afferent_coupling: 4,
        efferent_coupling: 5,
        instability: 0.56,
        is_circular: true,
        is_high_coupling: false,
        cyclomatic_complexity: 18,
        max_complexity: 10,
        maintainability_index: 58,
        lines_of_code: 267,
        complexity_grade: 'C',
        maintainability_grade: 'D',
        is_hot_zone: true,
        hot_zone_severity: 'warning' as const,
        hot_zone_score: 0.72,
        hot_zone_reason: 'Part of circular dependency chain'
      }
    },
    {
      id: 'services.payment',
      label: 'payment_service.py',
      type: 'internal' as const,
      module: 'services',
      position: { x: 0, y: -20, z: 22 },
      color: '#0d9488',
      cluster_id: 2,
      metrics: {
        afferent_coupling: 3,
        efferent_coupling: 6,
        instability: 0.67,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 25,
        max_complexity: 15,
        maintainability_index: 48,
        lines_of_code: 412,
        complexity_grade: 'D',
        maintainability_grade: 'D',
        is_hot_zone: true,
        hot_zone_severity: 'critical' as const,
        hot_zone_score: 0.88,
        hot_zone_reason: 'Very high cyclomatic complexity'
      }
    },
    {
      id: 'services.notification',
      label: 'notification_service.py',
      type: 'internal' as const,
      module: 'services',
      position: { x: 25, y: -15, z: 20 },
      color: '#0d9488',
      cluster_id: 2,
      metrics: {
        afferent_coupling: 2,
        efferent_coupling: 4,
        instability: 0.67,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 10,
        max_complexity: 6,
        maintainability_index: 75,
        lines_of_code: 156,
        complexity_grade: 'B',
        maintainability_grade: 'B',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.25,
        hot_zone_reason: ''
      }
    },
    {
      id: 'services.cache',
      label: 'cache_service.py',
      type: 'internal' as const,
      module: 'services',
      position: { x: -10, y: -25, z: 18 },
      color: '#0d9488',
      cluster_id: 2,
      metrics: {
        afferent_coupling: 6,
        efferent_coupling: 2,
        instability: 0.25,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 8,
        max_complexity: 5,
        maintainability_index: 82,
        lines_of_code: 134,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.12,
        hot_zone_reason: ''
      }
    },

    // Cluster 3: Models - Data models and schemas
    {
      id: 'models.user',
      label: 'user.py',
      type: 'internal' as const,
      module: 'models',
      position: { x: -30, y: 10, z: -15 },
      color: '#0d9488',
      cluster_id: 3,
      metrics: {
        afferent_coupling: 7,
        efferent_coupling: 2,
        instability: 0.22,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 4,
        max_complexity: 2,
        maintainability_index: 90,
        lines_of_code: 89,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.08,
        hot_zone_reason: ''
      }
    },
    {
      id: 'models.payment',
      label: 'payment.py',
      type: 'internal' as const,
      module: 'models',
      position: { x: -15, y: 15, z: -18 },
      color: '#0d9488',
      cluster_id: 3,
      metrics: {
        afferent_coupling: 5,
        efferent_coupling: 3,
        instability: 0.38,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 6,
        max_complexity: 3,
        maintainability_index: 85,
        lines_of_code: 112,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.1,
        hot_zone_reason: ''
      }
    },
    {
      id: 'models.base',
      label: 'base.py',
      type: 'internal' as const,
      module: 'models',
      position: { x: 0, y: 12, z: -20 },
      color: '#0d9488',
      cluster_id: 3,
      metrics: {
        afferent_coupling: 8,
        efferent_coupling: 1,
        instability: 0.11,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 3,
        max_complexity: 2,
        maintainability_index: 92,
        lines_of_code: 56,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.04,
        hot_zone_reason: ''
      }
    },
    {
      id: 'models.notification',
      label: 'notification.py',
      type: 'internal' as const,
      module: 'models',
      position: { x: 15, y: 15, z: -18 },
      color: '#0d9488',
      cluster_id: 3,
      metrics: {
        afferent_coupling: 3,
        efferent_coupling: 2,
        instability: 0.4,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 4,
        max_complexity: 2,
        maintainability_index: 88,
        lines_of_code: 78,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.06,
        hot_zone_reason: ''
      }
    },

    // Cluster 4: Utils - Helper functions and utilities
    {
      id: 'utils.logger',
      label: 'logger.py',
      type: 'internal' as const,
      module: 'utils',
      position: { x: 30, y: 0, z: -10 },
      color: '#64748b',
      cluster_id: 4,
      metrics: {
        afferent_coupling: 14,
        efferent_coupling: 1,
        instability: 0.07,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 5,
        max_complexity: 3,
        maintainability_index: 94,
        lines_of_code: 78,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.03,
        hot_zone_reason: ''
      }
    },
    {
      id: 'utils.validators',
      label: 'validators.py',
      type: 'internal' as const,
      module: 'utils',
      position: { x: 35, y: -10, z: -8 },
      color: '#64748b',
      cluster_id: 4,
      metrics: {
        afferent_coupling: 9,
        efferent_coupling: 0,
        instability: 0,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 12,
        max_complexity: 4,
        maintainability_index: 78,
        lines_of_code: 167,
        complexity_grade: 'B',
        maintainability_grade: 'B',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.15,
        hot_zone_reason: ''
      }
    },
    {
      id: 'utils.helpers',
      label: 'helpers.py',
      type: 'internal' as const,
      module: 'utils',
      position: { x: 35, y: 10, z: -8 },
      color: '#64748b',
      cluster_id: 4,
      metrics: {
        afferent_coupling: 11,
        efferent_coupling: 0,
        instability: 0,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 8,
        max_complexity: 5,
        maintainability_index: 86,
        lines_of_code: 145,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0.07,
        hot_zone_reason: ''
      }
    },

    // External/Third-party dependencies
    {
      id: 'external.requests',
      label: 'requests',
      type: 'third_party' as const,
      module: 'external',
      position: { x: -35, y: -5, z: 0 },
      color: '#f59e0b',
      cluster_id: null,
      metrics: {
        afferent_coupling: 0,
        efferent_coupling: 0,
        instability: 0,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 0,
        max_complexity: 0,
        maintainability_index: 100,
        lines_of_code: 0,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0,
        hot_zone_reason: ''
      }
    },
    {
      id: 'external.redis',
      label: 'redis',
      type: 'third_party' as const,
      module: 'external',
      position: { x: -40, y: -15, z: 5 },
      color: '#f59e0b',
      cluster_id: null,
      metrics: {
        afferent_coupling: 0,
        efferent_coupling: 0,
        instability: 0,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 0,
        max_complexity: 0,
        maintainability_index: 100,
        lines_of_code: 0,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0,
        hot_zone_reason: ''
      }
    },
    {
      id: 'external.stripe',
      label: 'stripe',
      type: 'third_party' as const,
      module: 'external',
      position: { x: -35, y: -25, z: 10 },
      color: '#f59e0b',
      cluster_id: null,
      metrics: {
        afferent_coupling: 0,
        efferent_coupling: 0,
        instability: 0,
        is_circular: false,
        is_high_coupling: false,
        cyclomatic_complexity: 0,
        max_complexity: 0,
        maintainability_index: 100,
        lines_of_code: 0,
        complexity_grade: 'A',
        maintainability_grade: 'A',
        is_hot_zone: false,
        hot_zone_severity: 'ok' as const,
        hot_zone_score: 0,
        hot_zone_reason: ''
      }
    }
  ],
  edges: [
    // From app.main
    { id: 'e1', source: 'app.main', target: 'app.config', imports: ['Config', 'load_config'], weight: 2, thickness: 1 },
    { id: 'e2', source: 'app.main', target: 'app.settings', imports: ['Settings'], weight: 1, thickness: 0.5 },
    { id: 'e3', source: 'app.main', target: 'api.routes', imports: ['router', 'register_routes'], weight: 3, thickness: 1.5 },
    { id: 'e4', source: 'app.main', target: 'api.middleware', imports: ['setup_middleware'], weight: 2, thickness: 1 },
    { id: 'e5', source: 'app.main', target: 'utils.logger', imports: ['logger', 'setup_logging'], weight: 1, thickness: 0.5 },

    // From api.routes
    { id: 'e6', source: 'api.routes', target: 'api.auth', imports: ['authenticate', 'require_auth'], weight: 3, thickness: 1.5 },
    { id: 'e7', source: 'api.routes', target: 'services.user', imports: ['UserService'], weight: 2, thickness: 1 },
    { id: 'e8', source: 'api.routes', target: 'services.payment', imports: ['PaymentService'], weight: 2, thickness: 1 },
    { id: 'e9', source: 'api.routes', target: 'services.notification', imports: ['NotificationService'], weight: 1, thickness: 0.5 },
    { id: 'e10', source: 'api.routes', target: 'utils.validators', imports: ['validate_request'], weight: 2, thickness: 1 },

    // From api.middleware
    { id: 'e11', source: 'api.middleware', target: 'app.config', imports: ['CORS_CONFIG'], weight: 1, thickness: 0.5 },
    { id: 'e12', source: 'api.middleware', target: 'utils.logger', imports: ['logger'], weight: 1, thickness: 0.5 },
    { id: 'e13', source: 'api.middleware', target: 'services.cache', imports: ['CacheService'], weight: 2, thickness: 1 },

    // From api.auth - circular dependency with services.user
    { id: 'e14', source: 'api.auth', target: 'services.user', imports: ['get_user', 'verify_user'], weight: 3, thickness: 1.5 },
    { id: 'e15', source: 'api.auth', target: 'app.config', imports: ['JWT_SECRET', 'TOKEN_EXPIRY'], weight: 1, thickness: 0.5 },
    { id: 'e16', source: 'api.auth', target: 'utils.logger', imports: ['logger'], weight: 1, thickness: 0.5 },
    { id: 'e17', source: 'api.auth', target: 'models.user', imports: ['User'], weight: 2, thickness: 1 },

    // From services.user - creates circular with api.auth
    { id: 'e18', source: 'services.user', target: 'api.auth', imports: ['validate_token'], weight: 2, thickness: 1 },
    { id: 'e19', source: 'services.user', target: 'models.user', imports: ['User', 'UserCreate'], weight: 3, thickness: 1.5 },
    { id: 'e20', source: 'services.user', target: 'utils.validators', imports: ['validate_email'], weight: 1, thickness: 0.5 },
    { id: 'e21', source: 'services.user', target: 'utils.logger', imports: ['logger'], weight: 1, thickness: 0.5 },
    { id: 'e22', source: 'services.user', target: 'external.requests', imports: ['requests'], weight: 1, thickness: 0.5 },

    // From services.payment
    { id: 'e23', source: 'services.payment', target: 'models.payment', imports: ['Payment', 'PaymentCreate'], weight: 3, thickness: 1.5 },
    { id: 'e24', source: 'services.payment', target: 'models.user', imports: ['User'], weight: 2, thickness: 1 },
    { id: 'e25', source: 'services.payment', target: 'utils.logger', imports: ['logger'], weight: 1, thickness: 0.5 },
    { id: 'e26', source: 'services.payment', target: 'services.notification', imports: ['send_receipt'], weight: 2, thickness: 1 },
    { id: 'e27', source: 'services.payment', target: 'external.stripe', imports: ['stripe'], weight: 2, thickness: 1 },

    // From services.notification
    { id: 'e28', source: 'services.notification', target: 'models.notification', imports: ['Notification'], weight: 2, thickness: 1 },
    { id: 'e29', source: 'services.notification', target: 'utils.helpers', imports: ['format_message'], weight: 1, thickness: 0.5 },
    { id: 'e30', source: 'services.notification', target: 'utils.logger', imports: ['logger'], weight: 1, thickness: 0.5 },

    // From services.cache
    { id: 'e31', source: 'services.cache', target: 'app.config', imports: ['CACHE_CONFIG'], weight: 1, thickness: 0.5 },
    { id: 'e32', source: 'services.cache', target: 'external.redis', imports: ['redis'], weight: 2, thickness: 1 },

    // From models
    { id: 'e33', source: 'models.user', target: 'models.base', imports: ['BaseModel'], weight: 2, thickness: 1 },
    { id: 'e34', source: 'models.payment', target: 'models.base', imports: ['BaseModel'], weight: 2, thickness: 1 },
    { id: 'e35', source: 'models.payment', target: 'models.user', imports: ['User'], weight: 1, thickness: 0.5 },
    { id: 'e36', source: 'models.notification', target: 'models.base', imports: ['BaseModel'], weight: 2, thickness: 1 },

    // Settings dependencies
    { id: 'e37', source: 'app.settings', target: 'app.config', imports: ['Config'], weight: 1, thickness: 0.5 },
    { id: 'e38', source: 'app.settings', target: 'utils.helpers', imports: ['parse_env'], weight: 1, thickness: 0.5 }
  ]
};

export const exampleMetrics: GlobalMetrics = {
  total_files: 21,
  total_internal: 18,
  total_third_party: 3,
  avg_afferent_coupling: 5.2,
  avg_efferent_coupling: 2.8,
  circular_dependencies: [
    { cycle: ['api.auth', 'services.user', 'api.auth'] }
  ],
  high_coupling_files: ['app.main', 'api.routes', 'utils.logger'],
  coupling_threshold: 8,
  avg_complexity: 9.4,
  avg_maintainability: 78.5,
  hot_zone_files: [
    { file: 'api.auth', severity: 'critical', score: 0.92, reason: 'Circular dependency with high complexity', complexity: 22, coupling: 11 },
    { file: 'services.payment', severity: 'critical', score: 0.88, reason: 'Very high cyclomatic complexity', complexity: 25, coupling: 9 },
    { file: 'services.user', severity: 'warning', score: 0.72, reason: 'Part of circular dependency chain', complexity: 18, coupling: 9 },
    { file: 'api.routes', severity: 'warning', score: 0.68, reason: 'High coupling with moderate complexity', complexity: 15, coupling: 9 }
  ],
  clusters: [
    {
      cluster_id: 0,
      size: 3,
      internal_edges: 2,
      external_edges: 8,
      cohesion: 0.67,
      modularity_contribution: 0.12,
      avg_internal_coupling: 2.3,
      is_package_candidate: true,
      nodes: ['app.main', 'app.config', 'app.settings']
    },
    {
      cluster_id: 1,
      size: 3,
      internal_edges: 3,
      external_edges: 12,
      cohesion: 0.58,
      modularity_contribution: 0.15,
      avg_internal_coupling: 4.2,
      is_package_candidate: true,
      nodes: ['api.routes', 'api.middleware', 'api.auth']
    },
    {
      cluster_id: 2,
      size: 4,
      internal_edges: 4,
      external_edges: 14,
      cohesion: 0.62,
      modularity_contribution: 0.18,
      avg_internal_coupling: 3.8,
      is_package_candidate: true,
      nodes: ['services.user', 'services.payment', 'services.notification', 'services.cache']
    },
    {
      cluster_id: 3,
      size: 4,
      internal_edges: 4,
      external_edges: 8,
      cohesion: 0.75,
      modularity_contribution: 0.14,
      avg_internal_coupling: 2.5,
      is_package_candidate: true,
      nodes: ['models.user', 'models.payment', 'models.base', 'models.notification']
    },
    {
      cluster_id: 4,
      size: 3,
      internal_edges: 0,
      external_edges: 12,
      cohesion: 0.45,
      modularity_contribution: 0.08,
      avg_internal_coupling: 0,
      is_package_candidate: false,
      nodes: ['utils.logger', 'utils.validators', 'utils.helpers']
    }
  ]
};

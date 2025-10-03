/**
 * Solution Architect Agent
 * Designs system architecture and technical solutions
 */

import type { Env, Task, AgentId, KnowledgeEntry } from '../types';
import { Logger } from '../utils/logger';
import { KnowledgeBase } from '../core/knowledge-base';

export class SolutionArchitectAgent {
  private logger: Logger;
  private knowledgeBase: KnowledgeBase;
  private agentId: AgentId = 'agent-architect';

  constructor(env: Env) {
    this.logger = new Logger(env, 'SolutionArchitectAgent');
    this.knowledgeBase = new KnowledgeBase(env);
  }

  /**
   * Process architecture design task
   */
  async processTask(task: Task): Promise<{
    architecture: KnowledgeEntry;
    tech_stack: string[];
    api_design: Record<string, unknown>;
    data_model: Record<string, unknown>;
  }> {
    await this.logger.info('Processing architecture task', { taskId: task.id }, this.agentId);

    // Get PRD from previous task if available
    const prd = await this.getPRD(task);

    // Analyze technical requirements
    const technicalReqs = await this.analyzeTechnicalRequirements(prd?.content || task.description || '');

    // Research existing architectures
    const existingArchitectures = await this.researchExistingArchitectures(task.description || '');

    // Design architecture
    const architecture = await this.designArchitecture({
      task,
      prd,
      technicalReqs,
      existingArchitectures,
    });

    // Design API endpoints
    const apiDesign = this.designAPI(technicalReqs);

    // Design data model
    const dataModel = this.designDataModel(technicalReqs);

    // Save architecture document to knowledge base
    await this.knowledgeBase.createEntry({
      type: 'architecture',
      title: architecture.title,
      content: architecture.content,
      tags: architecture.tags,
      related_tasks: [task.id],
      author_agent_id: this.agentId,
    });

    await this.logger.info('Architecture design completed', { archId: architecture.id }, this.agentId);

    return {
      architecture,
      tech_stack: technicalReqs.recommended_stack,
      api_design: apiDesign,
      data_model: dataModel,
    };
  }

  /**
   * Get PRD from knowledge base
   */
  private async getPRD(task: Task): Promise<KnowledgeEntry | null> {
    if (task.dependencies && task.dependencies.length > 0) {
      const results = await this.knowledgeBase.search('', {
        type: 'prd',
        related_tasks: task.dependencies,
      });
      return results[0] || null;
    }
    return null;
  }

  /**
   * Analyze technical requirements from PRD
   */
  private async analyzeTechnicalRequirements(_prdContent: string): Promise<{
    scalability_needs: string;
    performance_targets: Record<string, string>;
    security_requirements: string[];
    integration_points: string[];
    recommended_stack: string[];
  }> {
    // In production, AI would analyze the PRD
    return {
      scalability_needs: 'Medium - support up to 10K concurrent users',
      performance_targets: {
        api_response: '< 500ms',
        page_load: '< 2s',
        vector_search: '< 200ms',
      },
      security_requirements: ['JWT authentication', 'RBAC', 'Data encryption', 'Input validation'],
      integration_points: ['OpenAI API', 'MCP Protocol', 'NAS backup'],
      recommended_stack: [
        'Cloudflare Workers (TypeScript)',
        'D1 Database (SQLite)',
        'Vectorize (Vector DB)',
        'R2 Storage',
        'Hono.js (API framework)',
      ],
    };
  }

  /**
   * Research existing architecture patterns
   */
  private async researchExistingArchitectures(description: string): Promise<KnowledgeEntry[]> {
    const results = await this.knowledgeBase.search(description, {
      type: 'architecture',
      limit: 3,
    });
    return results;
  }

  /**
   * Design system architecture
   */
  private async designArchitecture(input: {
    task: Task;
    prd: KnowledgeEntry | null;
    technicalReqs: {
      scalability_needs: string;
      performance_targets: Record<string, string>;
      security_requirements: string[];
      integration_points: string[];
      recommended_stack: string[];
    };
    existingArchitectures: KnowledgeEntry[];
  }): Promise<KnowledgeEntry> {
    const archContent = `# Technical Architecture Document

## Executive Summary
This document outlines the technical architecture for: ${input.task.title}

## System Overview

### Architecture Pattern
- **Pattern**: Serverless Microservices on Cloudflare Workers
- **Scalability**: ${input.technicalReqs.scalability_needs}
- **Deployment**: Edge computing with global distribution

### Technology Stack
${input.technicalReqs.recommended_stack.map((tech) => `- ${tech}`).join('\n')}

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Edge                     │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Workers    │  │   Workers    │  │  Workers  │ │
│  │   (API)      │  │   (RAG)      │  │  (Backup) │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                 │       │
│  ┌──────▼─────────────────▼─────────────────▼─────┐ │
│  │         D1 Database (SQLite)                    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Vectorize   │  │      R2      │  │    KV     │ │
│  │  (Vectors)   │  │   (Files)    │  │  (Cache)  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │   NAS Backup     │
              │   (rclone sync)  │
              └──────────────────┘
\`\`\`

## API Design

### Core Endpoints
- \`POST /api/v1/chat\` - Chat with RAG system
- \`POST /api/v1/documents\` - Upload documents
- \`GET /api/v1/documents\` - List documents
- \`POST /api/v1/search\` - Semantic search
- \`POST /api/v1/tasks\` - Create task
- \`GET /api/v1/tasks\` - List tasks
- \`GET /api/v1/agents\` - List agents

### Authentication
- JWT token-based authentication
- Token expiry: 24 hours
- Refresh token: 30 days

## Data Model

### Core Tables
1. **users** - User accounts
2. **conversations** - Chat conversations
3. **messages** - Individual messages
4. **documents** - Uploaded documents
5. **tasks** - Agent tasks
6. **agents** - Agent registry
7. **knowledge_entries** - Knowledge base

### Vector Storage
- Embedding model: OpenAI text-embedding-3-small (1536 dimensions)
- Similarity metric: Cosine similarity
- Top-K retrieval: 5 documents

## Performance Optimization

### Targets
${Object.entries(input.technicalReqs.performance_targets)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

### Strategies
- Edge caching with KV Store
- Database query optimization
- Vector index optimization
- Async processing with Queues

## Security Design

### Requirements
${input.technicalReqs.security_requirements.map((req) => `- ${req}`).join('\n')}

### Implementation
- All endpoints require authentication
- Input sanitization and validation
- SQL injection prevention (prepared statements)
- XSS protection
- CORS policy enforcement

## Integration Points
${input.technicalReqs.integration_points.map((point) => `- ${point}`).join('\n')}

## Deployment Strategy

### Environments
- **Development**: Local with \`wrangler dev\`
- **Staging**: Cloudflare staging environment
- **Production**: Cloudflare production with custom domain

### CI/CD Pipeline
1. Code push to GitHub
2. Run tests and linting
3. Deploy to staging
4. Run E2E tests
5. Manual approval
6. Deploy to production

## Backup and Recovery

### Strategy
- Real-time incremental backup via Queues
- Hourly incremental backup
- Daily full backup at 02:00 UTC
- R2 sync every 6 hours

### Recovery Objectives
- RTO: 4 hours
- RPO: 1 hour

## Monitoring and Alerting

### Metrics
- API response time (p50, p95, p99)
- Error rate
- Database performance
- Vector search latency
- Backup success rate

### Alerts
- Critical: Error rate > 5%
- Warning: Response time > 1s
- Info: Backup completed

## Risks and Mitigation

### Technical Risks
1. **Cloudflare Workers CPU limit (10ms)**
   - Mitigation: Use async processing, offload to Queues
2. **D1 database size limit**
   - Mitigation: Regular archival, data retention policy
3. **Vector search accuracy**
   - Mitigation: Quality monitoring, reindexing

---
*Generated by Solution Architect Agent for Task ${input.task.id}*
`;

    const architecture: KnowledgeEntry = {
      id: `arch-${Date.now()}`,
      type: 'architecture',
      title: `Architecture: ${input.task.title}`,
      content: archContent,
      tags: ['architecture', 'design', 'cloudflare', 'rag'],
      related_tasks: [input.task.id],
      author_agent_id: this.agentId,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    return architecture;
  }

  /**
   * Design API endpoints
   */
  private designAPI(_technicalReqs: {
    security_requirements: string[];
    integration_points: string[];
  }): Record<string, unknown> {
    return {
      base_url: '/api/v1',
      authentication: 'Bearer JWT',
      endpoints: [
        {
          path: '/chat',
          method: 'POST',
          description: 'Send message and get RAG response',
          auth_required: true,
          request_body: {
            conversation_id: 'string',
            message: 'string',
          },
          response: {
            message_id: 'string',
            content: 'string',
            sources: 'array',
          },
        },
        {
          path: '/documents',
          method: 'POST',
          description: 'Upload document to knowledge base',
          auth_required: true,
          request_body: {
            title: 'string',
            content: 'string',
            tags: 'array',
          },
          response: {
            document_id: 'string',
            indexed: 'boolean',
          },
        },
        {
          path: '/search',
          method: 'POST',
          description: 'Semantic search in knowledge base',
          auth_required: true,
          request_body: {
            query: 'string',
            top_k: 'number',
            filter: 'object',
          },
          response: {
            results: 'array',
            total: 'number',
          },
        },
      ],
    };
  }

  /**
   * Design data model
   */
  private designDataModel(_technicalReqs: { recommended_stack: string[] }): Record<string, unknown> {
    return {
      database: 'D1 (SQLite)',
      tables: {
        users: {
          id: 'TEXT PRIMARY KEY',
          email: 'TEXT UNIQUE NOT NULL',
          password_hash: 'TEXT',
          name: 'TEXT',
          role: 'TEXT',
          created_at: 'INTEGER',
          updated_at: 'INTEGER',
        },
        conversations: {
          id: 'TEXT PRIMARY KEY',
          user_id: 'TEXT REFERENCES users(id)',
          title: 'TEXT',
          status: 'TEXT',
          created_at: 'INTEGER',
          updated_at: 'INTEGER',
        },
        messages: {
          id: 'TEXT PRIMARY KEY',
          conversation_id: 'TEXT REFERENCES conversations(id)',
          role: 'TEXT',
          content: 'TEXT',
          agent_id: 'TEXT',
          created_at: 'INTEGER',
        },
        documents: {
          id: 'TEXT PRIMARY KEY',
          title: 'TEXT',
          content: 'TEXT',
          category: 'TEXT',
          tags: 'TEXT',
          vector_id: 'TEXT',
          created_at: 'INTEGER',
          updated_at: 'INTEGER',
        },
        tasks: {
          id: 'TEXT PRIMARY KEY',
          type: 'TEXT',
          title: 'TEXT',
          status: 'TEXT',
          priority: 'TEXT',
          assigned_to: 'TEXT',
          created_by: 'TEXT',
          created_at: 'INTEGER',
          updated_at: 'INTEGER',
        },
      },
      indexes: [
        'CREATE INDEX idx_messages_conversation ON messages(conversation_id)',
        'CREATE INDEX idx_tasks_status ON tasks(status)',
        'CREATE INDEX idx_documents_tags ON documents(tags)',
      ],
    };
  }

  /**
   * Validate architecture design
   */
  async validateArchitecture(archId: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const arch = await this.knowledgeBase.getEntry(archId);
    if (!arch) {
      return {
        valid: false,
        issues: ['Architecture document not found'],
        recommendations: [],
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check required sections
    const requiredSections = [
      'System Overview',
      'Architecture Diagram',
      'API Design',
      'Data Model',
      'Security Design',
      'Deployment Strategy',
    ];

    for (const section of requiredSections) {
      if (!arch.content.includes(section)) {
        issues.push(`Missing section: ${section}`);
      }
    }

    // Check for Cloudflare-specific considerations
    if (!arch.content.includes('Workers')) {
      recommendations.push('Consider Cloudflare Workers for serverless execution');
    }
    if (!arch.content.includes('D1')) {
      recommendations.push('Consider D1 for database needs');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

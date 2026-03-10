# Foundry — Índice de Documentação

> **O Foundry é um sistema operacional agentic multiprovider, multi-runtime e multissuperfície para trabalho real com IA, organizado por Company e Project.**

---

## Status atual do projeto

| Item | Status |
|---|---|
| Etapa atual | Etapa 0 — Auditoria do repositório |
| Milestone ativo | M0 — Estado atual documentado |
| Último documento gerado | `docs/meta/00-index.md` |
| Próximo documento | `docs/product/01-vision.md` |

> Atualize esta tabela sempre que um documento novo for concluído ou o milestone avançar.

---

## Como usar esta documentação com agentes de código

**Antes de iniciar qualquer sessão de desenvolvimento com Copilot, Claude, Codex ou Gemini:**

1. Compartilhe `docs/implementation/21-agent-workflow.md` — é o documento central de operação com agentes
2. Compartilhe o documento específico da tarefa (ex: `docs/architecture/09-execution-fabric.md` para tarefas de runtime)
3. Mencione em qual milestone/etapa estamos (ver tabela acima)
4. Use o template de task breakdown disponível em `docs/implementation/21-agent-workflow.md`

**Regra principal:** nenhum agente deve tomar decisões de produto. Se houver dúvida de direção, consultar `docs/product/02-principles.md`.

---

## Por onde começar — por tipo de tarefa

### Estou chegando pela primeira vez
1. `docs/product/01-vision.md` — o que é o Foundry
2. `docs/product/02-principles.md` — o que nunca muda
3. `docs/meta/28-glossary.md` — termos específicos do projeto
4. `docs/implementation/21-agent-workflow.md` — como trabalhar aqui

### Vou implementar um módulo novo
1. `docs/implementation/21-agent-workflow.md` — leia primeiro
2. `docs/architecture/06-overview.md` — mapa técnico macro
3. `docs/architecture/07-domains.md` — bounded contexts
4. O documento de arquitetura específico do módulo
5. O task breakdown da etapa correspondente em `docs/delivery/task-breakdown/`

### Tenho uma dúvida de direção de produto
1. `docs/product/02-principles.md` — princípios permanentes
2. `docs/product/03-master-spec.md` — spec completo
3. `docs/meta/26-decisions-log.md` — decisões anteriores e raciocínio

### Vou trabalhar em uma fase específica do roadmap
1. O arquivo da fase em `docs/product/roadmap/`
2. `docs/product/05-mvp-plan.md` — em qual MVP essa fase está
3. O épico correspondente em `docs/delivery/22-epics.md`

### Estou iniciando uma sessão de desenvolvimento
1. `docs/implementation/21-agent-workflow.md` — sempre primeiro
2. `docs/delivery/23-milestones.md` — onde estamos
3. O task breakdown da etapa ativa

---

## Mapa completo de documentos

### Camada META
| Arquivo | Descrição |
|---|---|
| `docs/meta/00-index.md` | Este arquivo — mapa de navegação de toda a documentação |
| `docs/meta/26-decisions-log.md` | Histórico cronológico de todas as decisões tomadas com raciocínio |
| `docs/meta/27-references.md` | Catálogo de todos os repositórios e referências externas do projeto |
| `docs/meta/28-glossary.md` | Glossário de termos específicos do Foundry |
| `docs/meta/29-open-questions.md` | Questões ainda não decididas — lacunas explícitas |

### Camada PRODUTO
| Arquivo | Descrição |
|---|---|
| `docs/product/01-vision.md` | Visão, tese, problema, diferenciais e para quem é o Foundry |
| `docs/product/02-principles.md` | Princípios permanentes de produto, UX e arquitetura |
| `docs/product/03-master-spec.md` | Especificação mestre — fonte central de verdade de produto |
| `docs/product/05-mvp-plan.md` | Foundation + MVP1 + MVP2 + MVP3 + pós-MVP com critérios de done |
| `docs/product/roadmap/04a-fase-0-arquitetura-base.md` | Fase 0 — Arquitetura base e domínio |
| `docs/product/roadmap/04b-fase-1-companies.md` | Fase 1 — Companies como entidade de primeira classe |
| `docs/product/roadmap/04c-fase-2-catalogo.md` | Fase 2 — Catálogo, templates, skills, packs, MCP, ACP |
| `docs/product/roadmap/04d-fase-3-chat-cockpit.md` | Fase 3 — Chat Cockpit operacional |
| `docs/product/roadmap/04e-fase-4-workflow-editor.md` | Fase 4 — Node-based Workflow Editor |
| `docs/product/roadmap/04f-fase-5-browsing-research.md` | Fase 5 — Browsing, scraping, crawling, docs e research |
| `docs/product/roadmap/04g-fase-6-memory-layer.md` | Fase 6 — Memory layer persistente e multi-escopo |
| `docs/product/roadmap/04h-fase-7-acp-a2a.md` | Fase 7 — ACP/A2A interoperability layer |
| `docs/product/roadmap/04i-fase-8-orchestration.md` | Fase 8 — Advanced orchestration e research modes |
| `docs/product/roadmap/04j-fase-9-execution-fabric.md` | Fase 9 — Power-user execution fabric |
| `docs/product/roadmap/04k-fase-10-channels.md` | Fase 10 — Channels, desktop companion e superfícies externas |

### Camada ARQUITETURA
| Arquivo | Descrição |
|---|---|
| `docs/architecture/06-overview.md` | Macroarquitetura, 7 camadas, stack técnica e fluxo de dados |
| `docs/architecture/07-domains.md` | 12 bounded contexts, entidades, relações e regras de acoplamento |
| `docs/architecture/08-database-schema.md` | Schema do banco — estado atual, estado alvo e plano de migração |
| `docs/architecture/09-execution-fabric.md` | Runtimes, CLIs, worktrees, run monitor e compare mode |
| `docs/architecture/10-workflow-engine.md` | Graph model, nodes, edges, loops e execução de workflows |
| `docs/architecture/11-memory-layer.md` | Tipos, escopos, pipeline de ingestão, retrieval e governance |
| `docs/architecture/12-interop.md` | MCP, ACP, A2A, wrappers, bridges e trust model |
| `docs/architecture/13-channels.md` | Desktop, Telegram, notifications, handoff e channel policies |

### Camada DESIGN
| Arquivo | Descrição |
|---|---|
| `docs/design/14-design-system.md` | Tokens de design, componentes base e componentes específicos do Foundry |
| `docs/design/15-ux-patterns.md` | Layout tripartido, tool rail, composer, painéis e padrões de interação |
| `docs/design/16-surface-specs.md` | Spec detalhado de cada superfície do produto |

### Camada IMPLEMENTAÇÃO
| Arquivo | Descrição |
|---|---|
| `docs/implementation/17-tech-stack.md` | Stack completa com versões, justificativas e o que não usar |
| `docs/implementation/18-conventions.md` | Naming, estrutura de pastas, padrões de código e commits |
| `docs/implementation/19-foundation-plan.md` | 10 blocos obrigatórios da foundation com riscos e ordem |
| `docs/implementation/20-testing-strategy.md` | Estratégia de testes por camada com ferramentas e cobertura alvo |
| `docs/implementation/21-agent-workflow.md` | **Como trabalhar com Copilot, Claude, Codex e Gemini neste projeto** |

### Camada ENTREGA
| Arquivo | Descrição |
|---|---|
| `docs/delivery/22-epics.md` | Épicos macro por fase/módulo com escopo e critério de done |
| `docs/delivery/23-milestones.md` | Marcos de entrega verificáveis com critério de done objetivo |
| `docs/delivery/24-dependency-map.md` | O que depende de quê — ordem crítica e o que pode ser paralelizado |
| `docs/delivery/task-breakdown/etapa-0-repo-audit.md` | Tarefas atômicas da Etapa 0 — auditoria do repositório |
| `docs/delivery/task-breakdown/etapa-1-company-project.md` | Tarefas atômicas da Etapa 1 — Company, Project e schema |
| `docs/delivery/task-breakdown/etapa-2-chat-routing.md` | Tarefas atômicas da Etapa 2 — Chat com routing básico |
| `docs/delivery/task-breakdown/etapa-3-multiagent-basic.md` | Tarefas atômicas da Etapa 3 — Primeiro fluxo multiagente |
| `docs/delivery/task-breakdown/etapa-4-orchestration.md` | Tarefas atômicas da Etapa 4 — Orchestration expandida |

### Consolidado
| Arquivo | Descrição |
|---|---|
| `docs/00-full-context.md` | Consolidação dos docs estratégicos — para NotebookLM e onboarding rápido |

---

## Camadas da documentação — propósito de cada uma

| Camada | Propósito |
|---|---|
| **META** | Navegação, decisões, referências, glossário e questões abertas |
| **PRODUTO** | Visão, princípios, spec, roadmap e plano de MVPs |
| **ARQUITETURA** | Domínios, schema, engine de execução, memória, interop e canais |
| **DESIGN** | Design system, padrões de UX e specs por superfície |
| **IMPLEMENTAÇÃO** | Stack, convenções, foundation, testes e workflow com agentes |
| **ENTREGA** | Épicos, milestones, dependências e breakdowns atômicos por etapa |
| **CONSOLIDADO** | Versão unificada para consumo rápido por agentes e NotebookLM |

---

## Regras de manutenção

- **Este arquivo deve ser atualizado** sempre que um novo documento for concluído
- **A tabela de status** deve refletir o estado real do projeto em todo momento
- **Nenhum documento** deve ser criado sem primeiro aparecer neste índice
- **Links quebrados** devem ser corrigidos imediatamente — este é o documento de navegação central

---

*Gerado em: 2026-03-10 | Foundry Documentation v1.0*

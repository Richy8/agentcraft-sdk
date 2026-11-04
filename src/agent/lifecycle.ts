interface DisposableAgent {
  dispose(): Promise<void>;
}

const agentsPendingProcessCleanup = new Set<DisposableAgent>();
let processCleanupRegistered = false;

export function registerAgentForProcessCleanup(agent: DisposableAgent): void {
  agentsPendingProcessCleanup.add(agent);
  if (processCleanupRegistered) return;
  processCleanupRegistered = true;
  process.once("beforeExit", cleanupRegisteredAgents);
  process.once("SIGINT", cleanupRegisteredAgents);
  process.once("SIGTERM", cleanupRegisteredAgents);
}

export function unregisterAgentForProcessCleanup(agent: DisposableAgent): void {
  agentsPendingProcessCleanup.delete(agent);
}

function cleanupRegisteredAgents(): void {
  const agents = [...agentsPendingProcessCleanup];
  agentsPendingProcessCleanup.clear();
  for (const agent of agents) {
    void agent.dispose();
  }
}

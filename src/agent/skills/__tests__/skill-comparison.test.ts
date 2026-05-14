import { describe, expect, it } from 'vitest';
import { Agent } from '../../agent.js';
import { Provider } from '../../provider-catalog.js';
import { DeterministicFakeProvider } from '../../../testing/fake-provider.js';
import { HumanizerSkill, SummarizeSkill } from '../index.js';

const okStep = {
  response: {
    success: true,
    content: 'ok',
    tokensUsed: { prompt: 1, completion: 1, total: 2 },
    finishReason: 'stop' as const,
  },
};

describe('skill prompt comparison', () => {
  it('shows the delta between a basic prompt and skill-enhanced model call', async () => {
    const basic = agentWithFakeProvider();
    const skilled = agentWithFakeProvider().use(HumanizerSkill.create()).use(SummarizeSkill.create());

    await basic.run({ prompt: 'Rewrite this release note so it is easier to read.' });
    await skilled.run({ prompt: 'Rewrite this release note so it is easier to read.' });

    const basicCall = providerFor(basic).calls[0]!;
    const skilledCall = providerFor(skilled).calls[0]!;

    expect(basicCall.systemMessage).toBe('');
    expect(skilledCall.systemMessage).toContain('# Skill: humanizer');
    expect(skilledCall.systemMessage).toContain('# Skill: summarize');
    expect(skilledCall.systemMessage).toContain('## Quality Checklist');
    expect(skilledCall.systemMessage).toContain('## Safety Notes');
    expect(skilledCall.systemMessage!.length).toBeGreaterThan(2_000);
    expect(skilledCall.prompt).toBe(basicCall.prompt);
  });

  it('turns skill directives into bounded instruction regions', async () => {
    const agent = agentWithFakeProvider().use(HumanizerSkill.create());

    await agent.run({ prompt: '/humanizer This copy sounds robotic.' });

    const call = providerFor(agent).calls[0]!;
    expect(call.prompt).toContain('[APPLY_HUMANIZER_START]');
    expect(call.prompt).toContain('[APPLY_HUMANIZER_END]');
    expect(call.prompt).not.toContain('/humanizer');
    expect(call.systemMessage).toContain('apply the following rules strictly within those boundaries');
    expect(call.systemMessage).toContain('# Skill: humanizer');
  });
});

function agentWithFakeProvider(): Agent {
  const agent = Agent.create({ model: Provider.openai['gpt-4o'], apiKey: 'test-key' });
  const provider = new DeterministicFakeProvider(
    [okStep],
    { provider: 'openai', model: 'gpt-4o', apiKey: 'test-key' }
  );
  Object.defineProperty(agent, 'unifiedProvider', { value: provider });
  return agent;
}

function providerFor(agent: Agent): DeterministicFakeProvider {
  return (agent as unknown as { unifiedProvider: DeterministicFakeProvider }).unifiedProvider;
}

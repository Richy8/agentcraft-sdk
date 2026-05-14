import { ConfigurationError } from '../../errors/index.js';
import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import { createAdapter, tool } from './types.js';

export interface EmailAdapterConfig {
  provider: 'sendgrid' | 'smtp' | 'resend';
  apiKey?: string;
  host?: string;
  port?: number;
  from: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class EmailAdapter {
  static readonly adapterName = 'email';

  static connect(config: EmailAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? (config.provider === 'sendgrid' ? 'https://api.sendgrid.com/v3' : 'https://api.resend.com');
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    const headers = config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {};

    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: config.provider === 'smtp' ? 'custom' : 'api-key', trustLevel: 'review-required', sideEffects: ['read', 'write', 'external'], scopes: ['email'], requiredSecrets: ['EMAIL_API_KEY'], readOnly: false },
      tools: [
        tool({ name: 'send_email', description: 'Send an email.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['email:send'] }, params: { to: { type: 'array', description: 'Recipient email addresses.' }, subject: { type: 'string', description: 'Subject.' }, html: { type: 'string', description: 'HTML body.', required: false }, text: { type: 'string', description: 'Plain text body.', required: false } }, run: async ({ to, subject, html, text }) => run('send_email', (signal) => sendEmail(config, apiBaseUrl, headers, { to, subject, html, text }, signal)) }),
        tool({ name: 'send_template_email', description: 'Send a templated email.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['email:send'] }, params: { to: { type: 'array', description: 'Recipient email addresses.' }, templateId: { type: 'string', description: 'Template ID.' }, variables: { type: 'object', description: 'Template variables.', required: false } }, run: async ({ to, templateId, variables = {} }) => run('send_template_email', (signal) => sendEmail(config, apiBaseUrl, headers, { to, templateId, variables }, signal)) }),
        tool({ name: 'list_templates', description: 'List email templates when supported by the provider.', security: { sideEffect: 'external', scopes: ['email:read'] }, params: {}, run: async () => run('list_templates', (signal) => requestJson(apiBaseUrl, config.provider === 'sendgrid' ? '/templates' : '/templates', { headers, signal })) }),
      ],
    });
  }
}

function sendEmail(config: EmailAdapterConfig, apiBaseUrl: string, headers: Record<string, string>, payload: Record<string, unknown>, signal: AbortSignal) {
  if (config.provider === 'smtp') throw new ConfigurationError('SMTP execution requires a host application mailer integration');
  const body = config.provider === 'sendgrid'
    ? { personalizations: [{ to: (payload.to as unknown[]).map((email) => ({ email })) }], from: { email: config.from }, subject: payload.subject, content: [{ type: 'text/plain', value: payload.text ?? '' }], template_id: payload.templateId, dynamic_template_data: payload.variables }
    : { from: config.from, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text, template: payload.templateId, data: payload.variables };
  return requestJson(apiBaseUrl, config.provider === 'sendgrid' ? '/mail/send' : '/emails', { method: 'POST', headers, signal, body });
}

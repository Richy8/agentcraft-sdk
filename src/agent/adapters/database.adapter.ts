import { ConfigurationError, ToolExecutionError } from '../../errors/index.js';
import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { createAdapter, tool } from './types.js';
import type { AgentAdapter } from './types.js';

export interface DatabaseQueryResult {
  rows: unknown[];
  rowCount?: number;
}

export type DatabaseQueryExecutor = (query: string, params: unknown[], signal: AbortSignal) => Promise<DatabaseQueryResult>;

export interface DatabaseAdapterConfig {
  connectionString: string;
  dialect?: 'postgres' | 'mysql' | 'sqlite';
  schema?: string;
  readOnly?: boolean;
  rowLimit?: number;
  timeoutMs?: number;
  query?: DatabaseQueryExecutor;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

type SqlKind = 'read' | 'write' | 'schema' | 'unknown';

export class DatabaseAdapter {
  static readonly adapterName = 'database';

  static connect(config: DatabaseAdapterConfig): AgentAdapter {
    const readOnly = config.readOnly ?? true;
    const rowLimit = config.rowLimit ?? 100;
    const dialect = config.dialect ?? 'postgres';
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, {
        ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }),
        ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }),
      });
    const execute = async (query: string, params: unknown[], signal: AbortSignal) => {
      if (!config.query) throw new ConfigurationError('Database adapter requires a query executor for live execution');
      return config.query(query, params, signal);
    };

    return createAdapter({
      name: this.adapterName,
      metadata: {
        kind: 'native-sdk',
        auth: 'connection-string',
        trustLevel: 'review-required',
        sideEffects: readOnly ? ['read'] : ['read', 'write'],
        scopes: ['database'],
        requiredSecrets: ['DATABASE_URL'],
        readOnly,
      },
      tools: [
        tool({
          name: 'execute_query',
          description: 'Execute a parameterized SQL query through the configured database executor.',
          security: { sideEffect: readOnly ? 'read' : 'write', requiresConfirmation: !readOnly, scopes: ['database:query'] },
          params: {
            query: { type: 'string', description: 'SQL query text. Use placeholders and params instead of string interpolation.' },
            params: { type: 'array', description: 'Parameterized query values.', required: false },
          },
          run: async ({ query, params = [] }) =>
            run('execute_query', async (signal) => {
              assertQueryAllowed(query, readOnly);
              const result = await execute(addLimitIfRead(query, rowLimit), params, signal);
              return limitRows(result, rowLimit);
            }),
        }),
        tool({
          name: 'fetch_records',
          description: 'Fetch rows from a table with an optional WHERE clause and parameter values.',
          security: { sideEffect: 'read', scopes: ['database:read'] },
          params: {
            table: { type: 'string', description: 'Table name.' },
            where: { type: 'string', description: 'Optional SQL WHERE expression without the WHERE keyword.', required: false },
            params: { type: 'array', description: 'Parameterized WHERE values.', required: false },
          },
          run: async ({ table, where, params = [] }) =>
            run('fetch_records', (signal) => {
              const query = `SELECT * FROM ${quoteIdentifier(table)}${where ? ` WHERE ${where}` : ''} LIMIT ${rowLimit}`;
              return execute(query, params, signal).then((result) => limitRows(result, rowLimit));
            }),
        }),
        tool({
          name: 'insert_record',
          description: 'Insert one record into a table.',
          security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['database:write'] },
          params: { table: { type: 'string', description: 'Table name.' }, record: { type: 'object', description: 'Record fields.' } },
          run: async ({ table, record }) =>
            run('insert_record', (signal) => {
              assertWritable(readOnly);
              const entries = Object.entries(record);
              const columns = entries.map(([key]) => quoteIdentifier(key)).join(', ');
              const placeholders = entries.map((_entry, index) => placeholder(dialect, index + 1)).join(', ');
              return execute(`INSERT INTO ${quoteIdentifier(table)} (${columns}) VALUES (${placeholders}) RETURNING *`, entries.map(([, value]) => value), signal);
            }),
        }),
        tool({
          name: 'update_record',
          description: 'Update records in a table with a parameterized WHERE clause.',
          security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['database:write'] },
          params: {
            table: { type: 'string', description: 'Table name.' },
            record: { type: 'object', description: 'Fields to update.' },
            where: { type: 'string', description: 'SQL WHERE expression without the WHERE keyword.' },
            params: { type: 'array', description: 'Parameterized WHERE values.', required: false },
          },
          run: async ({ table, record, where, params = [] }) =>
            run('update_record', (signal) => {
              assertWritable(readOnly);
              const entries = Object.entries(record);
              const assignments = entries.map(([key], index) => `${quoteIdentifier(key)} = ${placeholder(dialect, index + 1)}`).join(', ');
              return execute(
                `UPDATE ${quoteIdentifier(table)} SET ${assignments} WHERE ${where} RETURNING *`,
                [...entries.map(([, value]) => value), ...params],
                signal
              );
            }),
        }),
        tool({
          name: 'delete_record',
          description: 'Delete records from a table with a parameterized WHERE clause.',
          security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['database:write'] },
          params: {
            table: { type: 'string', description: 'Table name.' },
            where: { type: 'string', description: 'SQL WHERE expression without the WHERE keyword.' },
            params: { type: 'array', description: 'Parameterized WHERE values.', required: false },
          },
          run: async ({ table, where, params = [] }) =>
            run('delete_record', (signal) => {
              assertWritable(readOnly);
              return execute(`DELETE FROM ${quoteIdentifier(table)} WHERE ${where} RETURNING *`, params, signal);
            }),
        }),
        tool({
          name: 'list_tables',
          description: 'List tables in the configured database schema.',
          security: { sideEffect: 'read', scopes: ['database:schema'] },
          params: {},
          run: async () =>
            run('list_tables', (signal) =>
              execute(
                dialect === 'sqlite'
                  ? "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
                  : 'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name',
                dialect === 'sqlite' ? [] : [config.schema ?? 'public'],
                signal
              )
            ),
        }),
      ],
    });
  }
}

function classifySql(query: string): SqlKind {
  const normalized = query.trim().replace(/^--.*$/gm, '').trim().toLowerCase();
  const first = normalized.split(/\s+/)[0] ?? '';
  if (['select', 'with', 'show', 'describe', 'explain'].includes(first)) return 'read';
  if (['insert', 'update', 'delete', 'merge', 'truncate'].includes(first)) return 'write';
  if (['create', 'alter', 'drop'].includes(first)) return 'schema';
  return 'unknown';
}

function assertQueryAllowed(query: string, readOnly: boolean): void {
  if (query.includes(';')) throw new ConfigurationError('Multiple SQL statements are not allowed');
  const kind = classifySql(query);
  if (kind === 'unknown') throw new ConfigurationError('SQL statement type is not recognized');
  if (readOnly && kind !== 'read') throw new ToolExecutionError('Database adapter is configured as read-only');
}

function assertWritable(readOnly: boolean): void {
  if (readOnly) throw new ToolExecutionError('Database adapter is configured as read-only');
}

function addLimitIfRead(query: string, rowLimit: number): string {
  if (classifySql(query) !== 'read' || /\blimit\s+\d+/i.test(query)) return query;
  return `${query} LIMIT ${rowLimit}`;
}

function limitRows(result: DatabaseQueryResult, rowLimit: number): DatabaseQueryResult {
  return { ...result, rows: result.rows.slice(0, rowLimit), rowCount: result.rowCount ?? result.rows.length };
}

function quoteIdentifier(identifier: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) throw new ConfigurationError(`Invalid SQL identifier '${identifier}'`);
  return `"${identifier}"`;
}

function placeholder(dialect: NonNullable<DatabaseAdapterConfig['dialect']>, index: number): string {
  return dialect === 'postgres' ? `$${index}` : '?';
}

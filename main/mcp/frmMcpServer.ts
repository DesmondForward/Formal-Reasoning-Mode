import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import Ajv, { type DefinedError } from 'ajv'
import addFormats from 'ajv-formats'
import draft7MetaSchema from 'ajv/dist/refs/json-schema-draft-07.json' with { type: 'json' }
import { z } from 'zod'

import frmSchemaJson from '../../frm_schema.json' with { type: 'json' }

const draft7MetaSchemaWithHttpsId = {
  ...draft7MetaSchema,
  $id: 'https://json-schema.org/draft-07/schema',
}

type ClientCallToolResult = Awaited<ReturnType<Client['callTool']>>

type ToolTextContent = {
  type: string
  text?: string
}

export type FrmValidationError = {
  message: string
  instancePath: string
  schemaPath: string
  keyword?: string
  params?: Record<string, unknown>
}

export type FrmValidationPayload =
  | { status: 'ok'; normalizedDocument: unknown }
  | { status: 'error'; errors: FrmValidationError[]; summary: string }

export type FrmValidationResult = FrmValidationPayload & { rawResult: ClientCallToolResult }

export type SubmitFrmResult = {
  status: 'accepted'
  problemId: string
  domain: string
  version: string
  rawResult: ClientCallToolResult
}

const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true })
if (!ajv.getSchema('https://json-schema.org/draft-07/schema')) {
  ajv.addMetaSchema(draft7MetaSchemaWithHttpsId)
}
addFormats(ajv)
const validateFrmSchema = ajv.compile(frmSchemaJson as Record<string, unknown>)

const validationErrorListSchema = z
  .array(
    z.object({
      message: z.string(),
      instancePath: z.string(),
      schemaPath: z.string(),
      keyword: z.string().optional(),
      params: z.record(z.string(), z.unknown()).optional(),
    }),
  )
  .nonempty()

const validationOutputShape = {
  status: z.enum(['ok', 'error']),
  normalizedDocument: z.unknown().optional(),
  summary: z.string().optional(),
  errors: validationErrorListSchema.optional(),
}

const validationResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    normalizedDocument: z.unknown(),
  }),
  z.object({
    status: z.literal('error'),
    errors: validationErrorListSchema,
    summary: z.string(),
    normalizedDocument: z.unknown().optional(),
  }),
])

const submitOutputShape = {
  status: z.literal('accepted'),
  problemId: z.string(),
  domain: z.string(),
  version: z.string(),
}

const submitResultSchema = z.object(submitOutputShape)

const validationInputShape = {
  document: z.record(z.string(), z.unknown(), {
    invalid_type_error: 'document argument must be a JSON object',
  }),
}

const server = new McpServer(
  { name: 'frm-mcp-server', version: '0.1.0' },
  {
    instructions:
      'Call validate_frm with the FRM JSON payload before invoking submit_frm_case. Pass the JSON object in the `document` argument.',
  },
)

server.registerTool(
  'validate_frm',
  {
    title: 'Validate Formal Reasoning Mode document',
    description: 'Validate an FRM payload against the Formal Reasoning Mode schema and receive granular issues.',
    inputSchema: z.object(validationInputShape) as any,
    outputSchema: z.object(validationOutputShape) as any,
  },
  async ({ document }: { document: unknown }) => handleValidate(document),
)

server.registerTool(
  'submit_frm_case',
  {
    title: 'Submit Formal Reasoning Mode case',
    description: 'Accept a valid FRM payload and surface identifying metadata.',
    inputSchema: z.object({
      document: validationInputShape.document,
    }) as any,
    outputSchema: z.object(submitOutputShape) as any,
  },
  async ({ document }: { document: unknown }) => handleSubmit(document),
)

const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

const client = new Client(
  {
    name: 'frm-desktop-main',
    version: '1.0.0',
  },
  {
    capabilities: {
    },
  },
)

let initialized = false

const initPromise = Promise.all([server.connect(serverTransport), client.connect(clientTransport)]).then(() => {
  initialized = true
})

const ensureInitialized = async () => {
  if (!initialized) {
    await initPromise
  }
}

const toErrorList = (errors: DefinedError[]): FrmValidationError[] =>
  errors.map((error) => ({
    message: error.message ?? 'Schema violation',
    instancePath: error.instancePath || '/',
    schemaPath: error.schemaPath,
    keyword: error.keyword,
    params: error.params && Object.keys(error.params).length > 0 ? { ...error.params } : undefined,
  }))

const handleValidate = async (document: unknown): Promise<CallToolResult> => {
  const valid = validateFrmSchema(document)

  if (valid) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ status: 'ok', normalizedDocument: document }),
        },
      ],
      structuredContent: { status: 'ok', normalizedDocument: document },
      isError: false,
    }
  }

  const errors = toErrorList((validateFrmSchema.errors ?? []) as DefinedError[])
  const summary = `${errors.length} schema issue${errors.length === 1 ? '' : 's'} detected.`

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ status: 'error', errors, summary }),
      },
    ],
    structuredContent: { status: 'error', errors, summary },
    isError: true,
  }
}

const handleSubmit = async (document: unknown): Promise<CallToolResult> => {
  const validationResult = await handleValidate(document)
  const payload = validationResult.structuredContent as FrmValidationPayload

  if (payload.status === 'error') {
    return {
      ...validationResult,
      isError: true,
    }
  }

  const metadata = extractMetadata(payload.normalizedDocument)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'accepted',
          problemId: metadata.problemId ?? 'unknown-problem-id',
          domain: metadata.domain ?? 'unknown-domain',
          version: metadata.version ?? 'v0.0',
        }),
      },
    ],
    structuredContent: {
      status: 'accepted',
      problemId: metadata.problemId ?? 'unknown-problem-id',
      domain: metadata.domain ?? 'unknown-domain',
      version: metadata.version ?? 'v0.0',
    },
    isError: false,
  }
}

const extractMetadata = (document: unknown): {
  problemId?: string
  domain?: string
  version?: string
} => {
  if (!document || typeof document !== 'object') {
    return {}
  }

  const meta = (document as Record<string, unknown>).metadata
  if (!meta || typeof meta !== 'object') {
    return {}
  }

  const metaRecord = meta as Record<string, unknown>

  return {
    problemId: typeof metaRecord.problem_id === 'string' ? metaRecord.problem_id : undefined,
    domain: typeof metaRecord.domain === 'string' ? metaRecord.domain : undefined,
    version: typeof metaRecord.version === 'string' ? metaRecord.version : undefined,
  }
}

export const callValidateTool = async (document: unknown): Promise<FrmValidationResult> => {
  await ensureInitialized()
  const result = await client.callTool({ name: 'validate_frm', arguments: { document } })
  const payload = parseValidationPayload(result)
  return { ...payload, rawResult: result }
}

export const callSubmitTool = async (document: unknown): Promise<SubmitFrmResult> => {
  await ensureInitialized()
  const result = await client.callTool({ name: 'submit_frm_case', arguments: { document } })
  const parsed = submitResultSchema.parse((result.structuredContent ?? {}) as unknown)
  return { status: 'accepted', problemId: parsed.problemId, domain: parsed.domain, version: parsed.version, rawResult: result }
}

const parseValidationPayload = (result: ClientCallToolResult): FrmValidationPayload => {
  const structured = result.structuredContent as unknown
  try {
    const parsed = validationResultSchema.parse(structured)
    if (parsed.status === 'ok') {
      return { status: 'ok', normalizedDocument: parsed.normalizedDocument }
    }

    return {
      status: 'error',
      errors: parsed.errors,
      summary: parsed.summary,
    }
  } catch (_) {
    const fallbackText = getFirstTextContent(result)
    if (fallbackText) {
      try {
        const parsedJson = JSON.parse(fallbackText)
        const parsed = validationResultSchema.parse(parsedJson)
        if (parsed.status === 'ok') {
          return { status: 'ok', normalizedDocument: parsed.normalizedDocument }
        }

        return {
          status: 'error',
          errors: parsed.errors,
          summary: parsed.summary,
        }
      } catch (error) {
        throw new Error('validate_frm returned unparseable content')
      }
    }
    throw new Error('validate_frm returned empty content')
  }
}

const getFirstTextContent = (result: ClientCallToolResult): string | undefined => {
  const payload = (result as { content?: unknown }).content
  if (!Array.isArray(payload)) {
    return undefined
  }

  const entry = (payload as ToolTextContent[]).find(
    (item): item is ToolTextContent & { text: string } =>
      !!item && typeof item === 'object' && item.type === 'text' && typeof item.text === 'string',
  )

  return entry?.text
}





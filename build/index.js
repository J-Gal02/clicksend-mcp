#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { ClickSendClient } from './client.js';
import { validateSMSParams, validateTTSParams, ValidationError } from './utils/validation.js';
const CLICKSEND_USERNAME = process.env.CLICKSEND_USERNAME;
const CLICKSEND_API_KEY = process.env.CLICKSEND_API_KEY;
if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
    throw new Error('CLICKSEND_USERNAME and CLICKSEND_API_KEY environment variables are required');
}
class ClickSendServer {
    constructor() {
        this.lastActionTime = 0;
        this.RATE_LIMIT_MS = 12000; // 5 actions per minute
        this.server = new Server({
            name: 'clicksend-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.client = new ClickSendClient(CLICKSEND_USERNAME || "", CLICKSEND_API_KEY || "");
        this.setupToolHandlers();
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    checkRateLimit() {
        const now = Date.now();
        if (now - this.lastActionTime < this.RATE_LIMIT_MS) {
            throw new McpError(ErrorCode.InvalidRequest, `Rate limit exceeded. Please wait ${Math.ceil((this.RATE_LIMIT_MS - (now - this.lastActionTime)) / 1000)} seconds.`);
        }
        this.lastActionTime = now;
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'send_sms',
                    description: 'Send SMS messages via ClickSend',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            to: {
                                type: 'string',
                                description: 'Phone number in E.164 format (e.g. +61423456789)'
                            },
                            message: {
                                type: 'string',
                                description: 'Message content to send'
                            }
                        },
                        required: ['to', 'message'],
                        additionalProperties: false
                    }
                },
                {
                    name: 'make_tts_call',
                    description: 'Make Text-to-Speech calls via ClickSend',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            to: {
                                type: 'string',
                                description: 'Phone number in E.164 format'
                            },
                            message: {
                                type: 'string',
                                description: 'Text content to convert to speech'
                            },
                            voice: {
                                type: 'string',
                                enum: ['female', 'male'],
                                default: 'female',
                                description: 'Voice type for TTS'
                            }
                        },
                        required: ['to', 'message'],
                        additionalProperties: false
                    }
                }
            ]
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                this.checkRateLimit();
                switch (request.params.name) {
                    case 'send_sms': {
                        const { to, message } = request.params.arguments;
                        validateSMSParams(to, message);
                        const result = await this.client.sendSMS({ to, message });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `SMS sent successfully: ${JSON.stringify(result)}`
                                }
                            ]
                        };
                    }
                    case 'make_tts_call': {
                        const { to, message, voice } = request.params.arguments;
                        validateTTSParams(to, message, voice);
                        const result = await this.client.makeTTSCall({ to, message, voice });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `TTS call initiated successfully: ${JSON.stringify(result)}`
                                }
                            ]
                        };
                    }
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }
            }
            catch (error) {
                if (error instanceof ValidationError) {
                    throw new McpError(ErrorCode.InvalidParams, error.message);
                }
                if (error instanceof McpError) {
                    throw error;
                }
                throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : 'Unknown error occurred');
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('ClickSend MCP server running on stdio');
    }
}
const server = new ClickSendServer();
server.run().catch(console.error);

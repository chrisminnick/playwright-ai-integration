import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIPlaywrightIntegration } from './ai-integration.js';
import dotenv from 'dotenv';
import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PlaywrightAIServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.aiIntegration = null;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  setupRoutes() {
    // Serve the main interface
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // API endpoint to start a new session
    this.app.post('/api/start-session', async (req, res) => {
      try {
        if (this.aiIntegration) {
          await this.aiIntegration.cleanup();
        }

        const apiKey = req.body.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return res.status(400).json({
            error: 'OpenAI API key is required',
          });
        }

        this.aiIntegration = new AIPlaywrightIntegration(apiKey);
        await this.aiIntegration.startMCPServer();

        res.json({
          success: true,
          message: 'Session started successfully',
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
        });
      }
    });

    // API endpoint to process a prompt
    this.app.post('/api/process-prompt', async (req, res) => {
      try {
        if (!this.aiIntegration) {
          return res.status(400).json({
            error: 'No active session. Start a session first.',
          });
        }

        const { prompt } = req.body;
        if (!prompt) {
          return res.status(400).json({
            error: 'Prompt is required',
          });
        }

        const result = await this.aiIntegration.processPrompt(prompt);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: error.message,
        });
      }
    });

    // API endpoint to get session status
    this.app.get('/api/session-status', (req, res) => {
      res.json({
        active: !!this.aiIntegration,
        connected: this.aiIntegration ? this.aiIntegration.isConnected : false,
      });
    });

    // API endpoint to stop session
    this.app.post('/api/stop-session', async (req, res) => {
      try {
        if (this.aiIntegration) {
          await this.aiIntegration.cleanup();
          this.aiIntegration = null;
        }

        res.json({
          success: true,
          message: 'Session stopped successfully',
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
        });
      }
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('Client connected via WebSocket');

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);

          if (data.type === 'process-prompt') {
            if (!this.aiIntegration) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  message: 'No active session',
                })
              );
              return;
            }

            // Set up real-time updates
            this.aiIntegration.on('actionExecuted', (data) => {
              ws.send(
                JSON.stringify({
                  type: 'action-executed',
                  data,
                })
              );
            });

            const result = await this.aiIntegration.processPrompt(data.prompt);
            ws.send(
              JSON.stringify({
                type: 'result',
                data: result,
              })
            );
          }
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: error.message,
            })
          );
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });
    });
  }

  async start(port = 3000) {
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        console.log(
          `Playwright AI Integration server running on http://localhost:${port}`
        );
        resolve();
      });
    });
  }

  async stop() {
    if (this.aiIntegration) {
      await this.aiIntegration.cleanup();
    }
    this.server.close();
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new PlaywrightAIServer();
  server.start().catch(console.error);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await server.stop();
    process.exit(0);
  });
}

export { PlaywrightAIServer };
